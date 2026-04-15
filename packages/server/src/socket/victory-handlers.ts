/**
 * 胜利条件/钥匙/残灵/奖励 Socket 处理
 */

import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C } from 'shared'
import type { WarResponse, SecretKeyUseType } from 'shared'
import { z } from 'zod'
import * as akashaKeyService from '../services/akasha-key.service.js'
import * as spiritService from '../services/spirit.service.js'
import * as rewardService from '../services/reward.service.js'
import * as groupService from '../services/group.service.js'
import * as groupCombatService from '../services/group-combat.service.js'
import * as gameService from '../services/game.service.js'
import * as playerService from '../services/player.service.js'
import * as logService from '../services/log.service.js'

const killRewardSchema = z.object({ choice: z.enum(['clear_cooldowns', 'reshuffle_deck', 'restore_hp', 'attribute_boost']) })
const spiritAttrsSchema = z.object({ spiritId: z.string(), attributes: z.array(z.string()).length(3) })
const abilityReplaceSchema = z.object({ oldSkillId: z.string(), newSkillId: z.string() })
const declareWarSchema = z.object({ targetGroupId: z.string() })
const warRespondSchema = z.object({ warId: z.string(), response: z.enum(['fight', 'flee']) })
const secretKeyUseSchema = z.object({ useType: z.enum(['prevent_fatal', 'restore_mp', 'discard_draw', 'recall_servant', 'group_move', 'forced_retreat', 'release_skill']) })

export function registerVictoryHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth

  // ── 阿克夏之钥 ──

  socket.on(C2S.AKASHA_KEY_PICK_UP, () => {
    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const player = playerService.getPlayer(auth.playerId)
    if (!player?.regionId) { emitError(socket, '你不在任何区域'); return }

    const result = akashaKeyService.pickUpKey(auth.roomId, group.id, player.regionId)
    if (!result.success) { emitError(socket, result.error!); return }

    io.to(roomKey).emit(S2C.AKASHA_KEY_PICKED_UP, {
      groupId: group.id,
      keyState: akashaKeyService.getKeyState(auth.roomId),
    })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'key', description: '携带阿克夏之钥' })
  })

  socket.on(C2S.AKASHA_KEY_PUT_DOWN, () => {
    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const player = playerService.getPlayer(auth.playerId)
    if (!player?.regionId) { emitError(socket, '你不在任何区域'); return }

    const result = akashaKeyService.putDownKey(auth.roomId, group.id, player.regionId)
    if (!result.success) { emitError(socket, result.error!); return }

    io.to(roomKey).emit(S2C.AKASHA_KEY_PUT_DOWN, {
      regionId: player.regionId,
      keyState: akashaKeyService.getKeyState(auth.roomId),
    })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'key', description: '放置阿克夏之钥' })
  })

  socket.on(C2S.AKASHA_KEY_CHANNEL, () => {
    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const result = akashaKeyService.channelMagic(auth.roomId, group.id)
    if (!result.success) { emitError(socket, result.error!); return }

    io.to(roomKey).emit(S2C.AKASHA_KEY_CHANNEL_PROGRESS, {
      groupId: group.id,
      progress: result.progress,
      required: result.required,
    })

    if (result.victory) {
      const event = akashaKeyService.createVictoryEvent(group.id, 'akasha_key_channeled')
      io.to(roomKey).emit(S2C.VICTORY, event)
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'victory', description: `${group.name} 完成许愿，获得胜利！` })
    }
  })

  // ── 残灵吸收 ──

  socket.on(C2S.SPIRIT_CHOOSE_ATTRIBUTES, (data: unknown) => {
    const parsed = spiritAttrsSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    if (!spiritService.validateSpiritAttributeChoice(parsed.data.attributes)) {
      emitError(socket, '必须选择3项不同属性')
      return
    }

    const result = spiritService.absorbSpirit(auth.roomId, parsed.data.spiritId, group.id)
    if (!result.success) { emitError(socket, result.error!); return }

    // 属性提升由调用方实际处理（需要更新 player 的属性等级）
    io.to(roomKey).emit(S2C.SPIRIT_ABSORBED, {
      groupId: group.id,
      spiritId: parsed.data.spiritId,
      attributes: parsed.data.attributes,
    })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'spirit', description: `吸收残灵，提升属性: ${parsed.data.attributes.join(', ')}` })
  })

  // ── 击杀奖励 ──

  socket.on(C2S.KILL_REWARD_CHOOSE, (data: unknown) => {
    const parsed = killRewardSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = rewardService.applyKillRewardChoice(auth.playerId, parsed.data.choice)
    if (!result.success) { emitError(socket, result.error!); return }

    socket.emit(S2C.KILL_REWARD_APPLIED, {
      playerId: auth.playerId,
      choice: parsed.data.choice,
      details: result.details,
    })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'reward', description: `选择击杀奖励: ${parsed.data.choice}` })
  })

  // ── 能力替换 ──

  socket.on(C2S.ABILITY_REPLACE, (data: unknown) => {
    const parsed = abilityReplaceSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = rewardService.executeReplace(auth.playerId, parsed.data.oldSkillId, parsed.data.newSkillId)
    if (!result.success) { emitError(socket, result.error!); return }

    socket.emit(S2C.ABILITY_REPLACED, {
      playerId: auth.playerId,
      oldSkillId: parsed.data.oldSkillId,
      newSkillId: parsed.data.newSkillId,
    })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'replace', description: '替换技能' })
  })

  socket.on(C2S.ABILITY_REPLACE_SKIP, () => {
    socket.emit(S2C.ABILITY_REPLACED, { playerId: auth.playerId, skipped: true })
  })

  // ── 秘钥使用 ──

  socket.on(C2S.SECRET_KEY_USE, (data: unknown) => {
    const parsed = secretKeyUseSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const used = groupService.useSecretKey(group.id)
    if (!used) { emitError(socket, '没有剩余的秘钥'); return }

    io.to(roomKey).emit(S2C.SECRET_KEY_UPDATE, {
      groupId: group.id,
      useType: parsed.data.useType,
      remaining: (group.secretKeysRemaining - 1),
    })
    logService.recordLog({
      roomId: auth.roomId,
      playerId: auth.playerId,
      actionType: 'key',
      description: `使用秘钥: ${parsed.data.useType}`,
    })
  })

  // ── 宣战 ──

  socket.on(C2S.DECLARE_WAR, (data: unknown) => {
    const parsed = declareWarSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const player = playerService.getPlayer(auth.playerId)
    if (!player?.regionId) { emitError(socket, '你不在任何区域'); return }

    const room = gameService.getRoom(auth.roomId)
    if (!room) return

    try {
      const war = groupCombatService.handleDeclareWar(
        auth.roomId,
        group.id,
        parsed.data.targetGroupId,
        player.regionId,
        room.turnNumber,
        room.currentActionPointIndex,
      )

      io.to(roomKey).emit(S2C.WAR_DECLARED, {
        warId: war.id,
        attackerGroupId: group.id,
        defenderGroupId: parsed.data.targetGroupId,
        regionId: player.regionId,
      })
      logService.recordLog({
        roomId: auth.roomId,
        playerId: auth.playerId,
        actionType: 'war',
        description: `向 ${parsed.data.targetGroupId} 宣战`,
      })
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '宣战失败')
    }
  })

  // ── 宣战响应 ──

  socket.on(C2S.WAR_RESPOND, (data: unknown) => {
    const parsed = warRespondSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = groupCombatService.handleWarResponse(
        auth.roomId,
        parsed.data.warId,
        parsed.data.response as WarResponse,
      )

      if (!result.war) { emitError(socket, '宣战记录不存在'); return }

      io.to(roomKey).emit(S2C.WAR_RESPONSE, {
        warId: parsed.data.warId,
        response: parsed.data.response,
        combatStarted: result.combatStarted || false,
        combatId: result.combatId,
      })

      if (result.combatStarted && result.combatId) {
        const combat = groupCombatService.getCombat(result.combatId)
        if (combat) {
          io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, combat)
        }
      }

      logService.recordLog({
        roomId: auth.roomId,
        playerId: auth.playerId,
        actionType: 'war',
        description: `宣战响应: ${parsed.data.response}`,
      })
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '响应失败')
    }
  })
}

/**
 * 战斗结束后的自动处理（由战斗服务调用）
 * - 检查淘汰 → 生成残灵 → 检查钥匙生成 → 检查胜利
 */
export function handlePostCombat(
  io: Server,
  roomKey: string,
  roomId: string,
  eliminatedGroupIds: string[],
  winnerGroupId: string | null,
): void {
  // 为淘汰的组生成残灵
  for (const gid of eliminatedGroupIds) {
    const group = groupService.getGroup(gid)
    if (!group) continue

    const servant = playerService.getPlayer(group.servantPlayerId)
    if (!servant?.regionId) continue

    const spirit = spiritService.spawnSpirit(roomId, servant.regionId, servant.id)
    io.to(roomKey).emit(S2C.SPIRIT_SPAWNED, { spirit })
    io.to(roomKey).emit(S2C.GROUP_ELIMINATED, { groupId: gid })
  }

  // 检查钥匙生成
  const keySpawn = akashaKeyService.checkKeySpawn(roomId)
  if (keySpawn.spawned && keySpawn.regionId) {
    io.to(roomKey).emit(S2C.AKASHA_KEY_SPAWNED, {
      regionId: keySpawn.regionId,
      keyState: akashaKeyService.getKeyState(roomId),
    })
  }

  // 检查最后一人胜利
  const lastStanding = akashaKeyService.checkLastStanding(roomId)
  if (lastStanding) {
    io.to(roomKey).emit(S2C.VICTORY, lastStanding)
  }

  // 给胜利方发击杀奖励
  if (winnerGroupId) {
    const winner = groupService.getGroup(winnerGroupId)
    if (winner) {
      // 基础奖励
      const baseReward = rewardService.applyBaseKillReward(winner.servantPlayerId)
      rewardService.addReplaceCount(winner.servantPlayerId)

      // 发送选择提示
      io.to(roomKey).emit(S2C.KILL_REWARD_PROMPT, {
        groupId: winnerGroupId,
        playerId: winner.servantPlayerId,
        baseReward,
      })

      // 发送替换候选
      const candidates = rewardService.drawReplacementCandidates(2)
      io.to(roomKey).emit(S2C.ABILITY_REPLACE_PROMPT, {
        groupId: winnerGroupId,
        candidates,
        remainingReplaces: rewardService.getReplaceCount(winner.servantPlayerId),
      })
    }
  }
}
