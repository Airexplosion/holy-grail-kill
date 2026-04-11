/**
 * 单机模式 Socket 事件处理器
 *
 * 完整对接 draft-engine 和 combat-engine：
 * - 轮抓：玩家选技能 → AI全部自动跟选 → 自动推进轮次
 * - 组卡：玩家提交 → AI自动组卡 → 进入游戏
 * - 行动阶段：玩家提交行动 → AI全部自动行动 → 推进
 * - 战斗：人类出牌后 → AI自动完成回合直到再轮到人类
 */

import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C, AI_TEMPLATES } from 'shared'
import * as soloGameService from '../services/solo-game.service.js'
import * as draftService from '../services/draft.service.js'
import * as combatService from '../services/combat.service.js'
import * as actionService from '../services/action.service.js'
import * as playerService from '../services/player.service.js'
import * as mapService from '../services/map.service.js'
import * as skillPoolService from '../services/skill-pool.service.js'
import * as groupService from '../services/group.service.js'
import * as aiBrain from '../services/ai-brain.service.js'
import { getAdjacentRegions } from '../engine/visibility.js'
import * as logService from '../services/log.service.js'
import { z } from 'zod'

const draftPickSchema = z.object({ skillId: z.string() })
const deckBuildSchema = z.object({
  strikeCards: z.object({ red: z.number(), blue: z.number(), green: z.number() }),
  skillIds: z.array(z.string()),
})
const actionSchema = z.object({
  actionType: z.string(),
  payload: z.record(z.unknown()),
})
const combatActionSchema = z.object({
  type: z.enum(['play_strike', 'use_skill', 'respond', 'pass']),
  cardColor: z.string().optional(),
  skillId: z.string().optional(),
  targetId: z.string().optional(),
})

export function registerSoloHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth
  if (!soloGameService.isSoloRoom(auth.roomId)) return

  const roomId = auth.roomId
  const humanPlayerId = auth.playerId

  // ── 轮抓 ──

  socket.on(C2S.SOLO_DRAFT_PICK, (data: unknown) => {
    const parsed = draftPickSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const humanGroup = getHumanGroup(roomId, humanPlayerId)
    if (!humanGroup) { emitError(socket, '找不到你的组'); return }

    // 人类选技能
    const result = draftService.draftPick(roomId, humanGroup.id, parsed.data.skillId)
    if (!result.success) { emitError(socket, result.error || '选取失败'); return }

    socket.emit(S2C.SOLO_DRAFT_PICK_MADE, {
      playerId: humanPlayerId,
      skill: result.skill,
      round: draftService.getDraftState(roomId)?.round,
    })

    // AI 全部自动选取（同一轮）
    const aiGroups = getAiGroups(roomId)
    const aiPicks: Array<{ groupId: string; skillName: string }> = []

    for (let i = 0; i < aiGroups.length; i++) {
      const aiGroup = aiGroups[i]!
      const template = AI_TEMPLATES[i % AI_TEMPLATES.length]!
      const pack = draftService.getGroupCurrentPack(roomId, aiGroup.id)

      if (pack.length > 0) {
        const chosen = aiBrain.pickDraftSkill(pack as any, template)
        if (chosen) {
          const aiResult = draftService.draftPick(roomId, aiGroup.id, chosen.id)
          if (aiResult.success && aiResult.skill) {
            aiPicks.push({ groupId: aiGroup.id, skillName: aiResult.skill.name })
          }
        } else {
          draftService.draftPickRandom(roomId, aiGroup.id)
        }
      }
    }

    // 状态更新
    const state = draftService.getDraftState(roomId)
    socket.emit(S2C.SOLO_AI_ACTIONS, { type: 'draft_picks', actions: aiPicks })
    socket.emit(S2C.SOLO_DRAFT_STATE, {
      phase: state?.phase || 'drafting',
      round: state?.round || 0,
      totalRounds: state?.totalRounds || 10,
      groupSelectionCounts: state?.groupSelectionCounts || {},
      draftComplete: state?.phase === 'selecting' || state?.phase === 'complete',
    })

    // 发送人类的新包
    if (state?.phase === 'drafting') {
      const newPack = draftService.getGroupCurrentPack(roomId, humanGroup.id)
      socket.emit(S2C.DRAFT_PACK_RECEIVED, { skills: newPack })
    }
  })

  // 轮抓定稿
  socket.on(C2S.DRAFT_FINALIZE, (data: { keepIds: string[] }) => {
    const humanGroup = getHumanGroup(roomId, humanPlayerId)
    if (!humanGroup) return

    const result = draftService.finalizeDraft(roomId, humanGroup.id, data.keepIds || [])
    if (!result.success) { emitError(socket, result.error || '定稿失败'); return }

    // 收集所有弃牌
    const allDiscarded: Array<{ skillId: string; name: string; skillClass: string; description: string; sourceName: string }> = []

    if (result.discarded) {
      for (const s of result.discarded) {
        allDiscarded.push({ skillId: s.id, name: s.name, skillClass: s.skillClass, description: s.description, sourceName: s.flavorText || '' })
      }
    }

    // AI 自动定稿（保留前7个）
    const aiGroups = getAiGroups(roomId)
    for (const aiGroup of aiGroups) {
      const selections = draftService.getGroupSelections(roomId, aiGroup.id)
      const keepIds = selections.slice(0, 7).map(s => s.id)
      const aiResult = draftService.finalizeDraft(roomId, aiGroup.id, keepIds)
      if (aiResult.discarded) {
        for (const s of aiResult.discarded) {
          allDiscarded.push({ skillId: s.id, name: s.name, skillClass: s.skillClass, description: s.description, sourceName: s.flavorText || '' })
        }
      }
    }

    // 弃牌入地图池
    if (allDiscarded.length > 0) {
      skillPoolService.addSkillsToPool(roomId, allDiscarded)
      skillPoolService.createSnapshot(roomId)
    }

    // 初始化替换追踪器
    const allServantIds = playerService.getNonGmPlayers(roomId)
      .filter(p => p.role === 'servant')
      .map(p => p.id)
    skillPoolService.initTrackersForRoom(roomId, allServantIds)

    draftService.completeDraft(roomId)
    socket.emit(S2C.SOLO_STATE, { stage: 'deck_build' })
    socket.emit(S2C.DRAFT_COMPLETE, { kept: result.kept })
  })

  // ── 组卡 ──

  socket.on(C2S.SOLO_DECK_BUILD_SUBMIT, (data: unknown) => {
    const parsed = deckBuildSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    socket.emit(S2C.SOLO_DECK_BUILD_STATE, { playerId: humanPlayerId, locked: true })

    // AI 自动组卡
    const aiGroups = getAiGroups(roomId)
    for (let i = 0; i < aiGroups.length; i++) {
      const template = AI_TEMPLATES[i % AI_TEMPLATES.length]!
      const aiSelections = draftService.getGroupSelections(roomId, aiGroups[i]!.id)
      aiBrain.buildDeck(aiSelections.map(s => s.id), template)
    }

    // 进入游戏
    socket.emit(S2C.SOLO_STATE, { stage: 'playing' })
    socket.emit(S2C.GAME_PHASE_CHANGED, { phase: 'round_start', turnNumber: 1 })
    logService.recordLog({ roomId, playerId: humanPlayerId, actionType: 'solo', description: '单机模式：进入游戏' })
  })

  // ── 行动阶段 ──

  socket.on(C2S.SOLO_ACTION_SUBMIT, (data: unknown) => {
    const parsed = actionSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      actionService.submitAction(roomId, humanPlayerId, parsed.data.actionType as any, parsed.data.payload as any)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '行动失败')
      return
    }

    socket.emit(S2C.SOLO_ACTION_STATE, { playerId: humanPlayerId, action: parsed.data, status: 'executed' })

    // AI 全部自动行动
    const aiServantIds = soloGameService.getAiServantIds(roomId)
    const adjacencyList = mapService.getRoomAdjacencies(roomId)
    const allRegions = mapService.getRoomRegions(roomId).map(r => r.id)
    const aiActions: Array<{ playerId: string; actionType: string; details: string }> = []

    for (let i = 0; i < aiServantIds.length; i++) {
      const aiId = aiServantIds[i]!
      const aiPlayer = playerService.getPlayer(aiId)
      if (!aiPlayer?.regionId) continue

      const template = AI_TEMPLATES[i % AI_TEMPLATES.length]!
      const adjacent = getAdjacentRegions(aiPlayer.regionId, adjacencyList as any)

      const decision = aiBrain.decideAction({
        style: template.actionStyle,
        currentRegionId: aiPlayer.regionId,
        adjacentRegionIds: adjacent,
        allRegionIds: allRegions,
        hasOutpostInRegion: false,
        outpostCount: 0,
        maxOutposts: 2,
        knownEnemyRegions: [],
        actionPointsRemaining: aiPlayer.actionPoints,
      })

      try {
        actionService.submitAction(roomId, aiId, decision.actionType as any, decision.payload as any)
        aiActions.push({ playerId: aiId, actionType: decision.actionType, details: `${aiPlayer.displayName}: ${decision.actionType}` })
      } catch {
        aiActions.push({ playerId: aiId, actionType: 'skip', details: `${aiPlayer.displayName}: 跳过` })
      }
    }

    socket.emit(S2C.SOLO_AI_ACTIONS, { type: 'action', actions: aiActions })
  })

  // ── 战斗 ──

  socket.on(C2S.SOLO_COMBAT_ACTION, (data: unknown) => {
    const parsed = combatActionSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const combatId = combatService.getPlayerCombatId(humanPlayerId)
    if (!combatId) { emitError(socket, '你不在战斗中'); return }

    const result = combatService.processAction(combatId, humanPlayerId, {
      type: parsed.data.type,
      cardColor: parsed.data.cardColor as any,
      skillId: parsed.data.skillId,
      targetId: parsed.data.targetId,
    })

    socket.emit(S2C.SOLO_COMBAT_STATE, result.snapshot)
    if (result.resolveResults.length > 0) {
      socket.emit(S2C.COMBAT_RESULT, { combatId, results: result.resolveResults })
    }

    if (!result.snapshot.isActive) {
      combatService.stopCombat(combatId)
      socket.emit(S2C.COMBAT_ENDED, { combatId })
      return
    }

    // AI 自动回合
    runAiCombatTurns(socket, combatId, humanPlayerId)
  })

  // ── 退出 ──

  socket.on(C2S.SOLO_QUIT, () => {
    const combatId = combatService.getPlayerCombatId(humanPlayerId)
    if (combatId) combatService.stopCombat(combatId)
    soloGameService.cleanupSoloGame(roomId)
    draftService.cleanupDraft(roomId)
    socket.emit(S2C.SOLO_RESULT, {
      stage: 'result', playerSurvived: false,
      combatsWon: 0, combatsLost: 0, totalRounds: 0, eliminatedAiCount: 0,
    })
  })

  // ── 启动轮抓（连接后客户端调用） ──

  socket.on(C2S.SOLO_CREATE, () => {
    const startResult = draftService.startDraft(roomId)
    if (!startResult.success) {
      emitError(socket, startResult.error || '轮抓启动失败')
      return
    }

    const humanGroup = getHumanGroup(roomId, humanPlayerId)
    if (!humanGroup) return

    const state = draftService.getDraftState(roomId)
    socket.emit(S2C.SOLO_STATE, { stage: 'draft' })
    socket.emit(S2C.SOLO_DRAFT_STATE, {
      phase: state?.phase,
      round: state?.round,
      totalRounds: state?.totalRounds,
      groupSelectionCounts: state?.groupSelectionCounts,
    })

    const pack = draftService.getGroupCurrentPack(roomId, humanGroup.id)
    socket.emit(S2C.DRAFT_PACK_RECEIVED, { skills: pack })
  })
}

// ── 辅助 ──

function getHumanGroup(roomId: string, humanPlayerId: string) {
  const allGroups = groupService.getAliveGroups(roomId)
  return allGroups.find(g => g.servantPlayerId === humanPlayerId || g.masterPlayerId === humanPlayerId) || null
}

function getAiGroups(roomId: string) {
  const allGroups = groupService.getAliveGroups(roomId)
  const aiIds = new Set(soloGameService.getAiServantIds(roomId))
  return allGroups.filter(g => aiIds.has(g.servantPlayerId))
}

/**
 * AI 自动战斗回合，循环到人类或战斗结束
 */
function runAiCombatTurns(socket: AuthenticatedSocket, combatId: string, humanPlayerId: string, depth = 0) {
  if (depth > 20) return

  const state = combatService.getCombatState(combatId)
  if (!state || !state.isActive) return
  if (state.activePlayerId === humanPlayerId) return

  const aiPlayerId = state.activePlayerId
  if (!aiPlayerId) return

  const aiPlayer = playerService.getPlayer(aiPlayerId)
  if (!aiPlayer) return

  let action: { type: string; cardColor?: string; skillId?: string; targetId?: string }

  if (state.phase === 'respond') {
    const chain = state.playChain as any[]
    const lastPlay = chain[chain.length - 1]
    const attackColor = lastPlay?.cardColor || 'red'
    const responseMap: Record<string, string> = { red: 'blue', blue: 'green', green: 'red' }
    const neededColor = responseMap[attackColor] || 'red'

    action = Math.random() < 0.7
      ? { type: 'respond', cardColor: neededColor }
      : { type: 'respond' }
  } else {
    const colors = ['red', 'blue', 'green']
    if (Math.random() < 0.7) {
      action = { type: 'play_strike', cardColor: colors[Math.floor(Math.random() * 3)]!, targetId: humanPlayerId }
    } else {
      action = { type: 'pass' }
    }
  }

  const result = combatService.processAction(combatId, aiPlayerId, action as any)

  setTimeout(() => {
    socket.emit(S2C.SOLO_COMBAT_STATE, result.snapshot)
    socket.emit(S2C.COMBAT_LOG_ENTRY, {
      type: 'ai_action', playerId: aiPlayerId, combatId,
      description: `${aiPlayer.displayName}: ${action.type}${action.cardColor ? ` (${action.cardColor})` : ''}`,
    })

    if (result.resolveResults.length > 0) {
      socket.emit(S2C.COMBAT_RESULT, { combatId, results: result.resolveResults })
    }

    if (!result.snapshot.isActive) {
      combatService.stopCombat(combatId)
      socket.emit(S2C.COMBAT_ENDED, { combatId })
      return
    }

    runAiCombatTurns(socket, combatId, humanPlayerId, depth + 1)
  }, 500)
}
