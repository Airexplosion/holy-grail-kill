/**
 * Group 战斗服务
 * 整合 group-combat-engine + encounter-engine + damage-calculator
 */

import type { StrikeColor, WarResponse } from 'shared'
import * as groupService from './group.service.js'
import * as playerService from './player.service.js'
import {
  initGroupCombat,
  handleGroupPlayStrike, handleGroupRespond, handleGroupPass,
  resolveGroupChain, nextGroupTurn,
  endGroupCombat, getGroupCombatSnapshot,
  isGroupCombatOver, getWinnerGroupId, getEliminatedGroupIds,
  type GroupCombatEngineState, type GroupCombatParticipant,
} from '../engine/group-combat-engine.js'
import {
  declareWar, respondToWar, getPendingWarForGroup,
  type WarDeclarationRecord,
} from '../engine/encounter-engine.js'
import { rankIndex } from '../engine/attribute-engine.js'
import type { AttributeRank } from 'shared'

// 内存中维护活跃的战斗
const activeCombats = new Map<string, GroupCombatEngineState>()
// roomId → combatId 映射
const roomCombats = new Map<string, string[]>()

/**
 * 发起宣战
 */
export function handleDeclareWar(
  roomId: string,
  attackerGroupId: string,
  defenderGroupId: string,
  regionId: string,
  turnNumber: number,
  actionPointIndex: number,
): WarDeclarationRecord {
  return declareWar(roomId, attackerGroupId, defenderGroupId, regionId, turnNumber, actionPointIndex)
}

/**
 * 处理宣战响应
 */
export function handleWarResponse(
  roomId: string,
  warId: string,
  response: WarResponse,
): { war: WarDeclarationRecord | null; combatStarted?: boolean; combatId?: string } {
  const war = respondToWar(roomId, warId, response)
  if (!war) return { war: null }

  if (war.status === 'accepted' || war.status === 'forced') {
    // 创建战斗
    const combat = startCombatFromWar(roomId, war)
    if (combat) {
      return { war, combatStarted: true, combatId: combat.combatId }
    }
  }

  return { war, combatStarted: false }
}

/**
 * 从宣战创建战斗
 */
function startCombatFromWar(roomId: string, war: WarDeclarationRecord): GroupCombatEngineState | null {
  const attackerGroup = groupService.getGroup(war.attackerGroupId)
  const defenderGroup = groupService.getGroup(war.defenderGroupId)
  if (!attackerGroup || !defenderGroup) return null

  const participants: GroupCombatParticipant[] = []

  for (const [group, isAttacker] of [[attackerGroup, true], [defenderGroup, false]] as const) {
    const servant = playerService.getPlayer(group.servantPlayerId)
    const master = playerService.getPlayer(group.masterPlayerId)
    if (!servant || !master) continue

    participants.push({
      groupId: group.id,
      isAttacker,
      servant: {
        playerId: servant.id,
        hp: servant.hp, hpMax: servant.hpMax,
        mp: servant.mp, mpMax: servant.mpMax,
        baseDamage: servant.baseDamage || 2,
        actions: servant.actionsMax || 2,
        ac: servant.armorClass || 0,
        agiRank: servant.agi ? rankIndex(servant.agi as AttributeRank) : 0,
      },
      master: {
        playerId: master.id,
        hp: master.hp, hpMax: master.hpMax,
        mp: master.mp, mpMax: master.mpMax,
        baseDamage: master.baseDamage || 0,
        ac: master.armorClass || 0,
      },
      tacticalStyleColor: (master.tacticalStyle as StrikeColor) || null,
      hand: new Map([['red', 8], ['blue', 8], ['green', 8]]), // TODO: from deck build
    })
  }

  if (participants.length < 2) return null

  const state = initGroupCombat(roomId, war.regionId, participants)
  activeCombats.set(state.combatId, state)

  const existing = roomCombats.get(roomId) || []
  existing.push(state.combatId)
  roomCombats.set(roomId, existing)

  return state
}

/**
 * 获取战斗状态
 */
export function getCombat(combatId: string): GroupCombatEngineState | null {
  return activeCombats.get(combatId) ?? null
}

/**
 * 获取房间内所有活跃战斗
 */
export function getRoomActiveCombats(roomId: string): GroupCombatEngineState[] {
  const ids = roomCombats.get(roomId) || []
  return ids.map(id => activeCombats.get(id)).filter(Boolean) as GroupCombatEngineState[]
}

/**
 * 处理出牌
 */
export function playStrike(
  combatId: string,
  groupId: string,
  cardColor: StrikeColor,
  targetGroupId: string,
) {
  const state = activeCombats.get(combatId)
  if (!state) return { success: false, error: '战斗不存在' }

  const result = handleGroupPlayStrike(state, groupId, cardColor, targetGroupId)
  return { ...result, snapshot: getGroupCombatSnapshot(state) }
}

/**
 * 处理响应
 */
export function respond(combatId: string, groupId: string, cardColor?: StrikeColor) {
  const state = activeCombats.get(combatId)
  if (!state) return { success: false, error: '战斗不存在' }

  const result = handleGroupRespond(state, groupId, cardColor)

  // 如果进入 resolve 阶段，自动结算
  if (state.phase === 'resolve') {
    resolveGroupChain(state)
  }

  return { ...result, snapshot: getGroupCombatSnapshot(state) }
}

/**
 * 处理 pass
 */
export function pass(combatId: string, groupId: string) {
  const state = activeCombats.get(combatId)
  if (!state) return { success: false, error: '战斗不存在' }

  const result = handleGroupPass(state, groupId)
  if (!result.success) return { ...result, snapshot: getGroupCombatSnapshot(state) }

  // 推进到下一个回合
  const { newRound } = nextGroupTurn(state)

  // 检查战斗是否结束
  const over = isGroupCombatOver(state)
  const winnerId = over ? getWinnerGroupId(state) : null
  const eliminatedIds = over ? getEliminatedGroupIds(state) : []

  if (over) {
    syncBackToDb(state)
    cleanupCombat(combatId)
  }

  return {
    ...result,
    snapshot: getGroupCombatSnapshot(state),
    newRound,
    combatOver: over,
    winnerId,
    eliminatedIds,
  }
}

/**
 * 战斗结束后同步状态回DB
 */
function syncBackToDb(state: GroupCombatEngineState): void {
  for (const gs of state.groupStates.values()) {
    // 同步幻身状态
    playerService.updatePlayerStats(gs.servant.playerId, {
      hp: gs.servant.hp,
      mp: gs.servant.mp,
    })
    // 同步篡者状态
    playerService.updatePlayerStats(gs.master.playerId, {
      hp: gs.master.hp,
      mp: gs.master.mp,
    })
    // 如果幻身死亡，标记组淘汰
    if (!gs.servant.alive) {
      groupService.eliminateServant(gs.groupId)
    }
  }
}

/**
 * 清理战斗
 */
function cleanupCombat(combatId: string): void {
  const state = activeCombats.get(combatId)
  if (state) {
    const ids = roomCombats.get(state.roomId)
    if (ids) {
      const filtered = ids.filter(id => id !== combatId)
      if (filtered.length > 0) {
        roomCombats.set(state.roomId, filtered)
      } else {
        roomCombats.delete(state.roomId)
      }
    }
  }
  activeCombats.delete(combatId)
}
