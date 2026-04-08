/**
 * 战斗服务 — 支持同一房间多场并发战斗
 * 每场战斗有唯一 combatId，玩家通过 combatId 参与
 */

import { v4 as uuid } from 'uuid'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { combatStates, combatLogs } from '../db/schema.js'
import * as playerService from './player.service.js'
import * as deckBuildService from './deck-build.service.js'
import * as skillLibraryService from './skill-library.service.js'
import {
  initCombat, handlePlayStrike, handleUseSkill, handleRespond,
  handlePass, resolveChain, nextTurn, endCombat, getSnapshot,
  type CombatEngineState,
} from '../engine/combat-engine.js'
import { createRuntimeSkill } from '../engine/skill-executor.js'
import type { StrikeColor, CombatAction } from 'shared'

/** All active combats keyed by combatId */
const activeCombats = new Map<string, CombatEngineState>()

/** Player → combatId mapping for quick lookup */
const playerCombatMap = new Map<string, string>()

export function startCombat(roomId: string, participantIds: string[]) {
  const allSkills = skillLibraryService.getAllSkills()
  const skillMap = new Map(allSkills.map(s => [s.id, s]))

  const participants = participantIds.map(pid => {
    const player = playerService.getPlayer(pid)
    if (!player) throw new Error(`玩家 ${pid} 不存在`)

    // Check player not already in combat
    if (playerCombatMap.has(pid)) throw new Error(`玩家 ${player.displayName} 已在战斗中`)

    const build = deckBuildService.getDeckBuild(roomId, pid)
    if (!build.isLocked) throw new Error(`玩家 ${player.displayName} 未锁定配置`)

    const skills = build.skillIds
      .map(id => skillMap.get(id))
      .filter(Boolean)
      .map(entry => createRuntimeSkill(entry!))

    const hand = new Map<StrikeColor, number>([
      ['red', build.strikeCards.red],
      ['blue', build.strikeCards.blue],
      ['green', build.strikeCards.green],
    ])

    return { id: pid, hp: player.hp, hpMax: player.hpMax, mp: player.mp, mpMax: player.mpMax, skills, hand }
  })

  const state = initCombat(roomId, participants)
  activeCombats.set(state.combatId, state)

  // Register player → combat mapping
  for (const pid of participantIds) {
    playerCombatMap.set(pid, state.combatId)
  }

  persistState(state)
  return getSnapshot(state)
}

export function processAction(combatId: string, playerId: string, action: CombatAction) {
  const state = activeCombats.get(combatId)
  if (!state || !state.isActive) throw new Error('战斗不存在或已结束')

  let result: { success: boolean; error?: string; results?: any[] }

  switch (action.type) {
    case 'play_strike':
      result = handlePlayStrike(state, playerId, action.cardColor, action.targetId)
      break
    case 'use_skill':
      result = handleUseSkill(state, playerId, action.skillId, action.targetId)
      break
    case 'respond':
      result = handleRespond(state, playerId, action.cardColor)
      break
    case 'pass':
      result = handlePass(state, playerId)
      break
    default:
      throw new Error('未知动作类型')
  }

  if (!result.success) throw new Error(result.error || '动作执行失败')

  let resolveResults: any[] = []
  if (state.phase === 'resolve') {
    resolveResults = resolveChain(state)
  }

  let newRound = false
  if (state.phase === 'end_turn') {
    const advanceResult = nextTurn(state)
    newRound = advanceResult.newRound
  }

  persistState(state)

  return {
    snapshot: getSnapshot(state),
    resolveResults,
    newRound,
    events: drainEvents(state),
  }
}

export function advanceTurn(combatId: string) {
  const state = activeCombats.get(combatId)
  if (!state || !state.isActive) throw new Error('战斗不存在或已结束')

  state.playChain = []
  const { newRound } = nextTurn(state)
  persistState(state)

  return { snapshot: getSnapshot(state), newRound, events: drainEvents(state) }
}

export function stopCombat(combatId: string) {
  const state = activeCombats.get(combatId)
  if (!state) return null

  endCombat(state)
  persistState(state)

  // Sync HP/MP back to player records
  for (const [pid, ps] of state.playerStates) {
    playerService.updatePlayerStats(pid, { hp: ps.hp, mp: ps.mp })
    playerCombatMap.delete(pid)
  }

  activeCombats.delete(combatId)
  return { snapshot: getSnapshot(state), events: drainEvents(state) }
}

export function getCombatState(combatId: string) {
  const state = activeCombats.get(combatId)
  if (!state) return null
  return getSnapshot(state)
}

/** Get combatId for a player (if in combat) */
export function getPlayerCombatId(playerId: string): string | null {
  return playerCombatMap.get(playerId) || null
}

/** Get all active combats in a room */
export function getRoomCombats(roomId: string) {
  const results: Array<ReturnType<typeof getSnapshot>> = []
  for (const state of activeCombats.values()) {
    if (state.roomId === roomId && state.isActive) {
      results.push(getSnapshot(state))
    }
  }
  return results
}

/** Check if a player is in any active combat */
export function isPlayerInCombat(playerId: string): boolean {
  return playerCombatMap.has(playerId)
}

// ===== Helpers =====

function persistState(state: CombatEngineState) {
  const db = getDb()
  const now = Date.now()

  const values = {
    roomId: state.roomId,
    roundNumber: state.roundNumber,
    turnIndex: state.turnIndex,
    turnOrder: JSON.stringify(state.turnOrder),
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    playChain: JSON.stringify(state.playChain),
    isActive: state.isActive,
    updatedAt: now,
  }

  const existing = db.select().from(combatStates).where(eq(combatStates.id, state.combatId)).get()
  if (existing) {
    db.update(combatStates).set(values).where(eq(combatStates.id, state.combatId)).run()
  } else {
    db.insert(combatStates).values({ id: state.combatId, ...values, startedAt: now }).run()
  }
}

function drainEvents(state: CombatEngineState) {
  const events = [...state.events]
  state.events = []

  const db = getDb()
  for (const event of events) {
    db.insert(combatLogs).values({
      id: uuid(),
      roomId: state.roomId,
      roundNumber: state.roundNumber,
      playerId: event.playerId || null,
      eventType: event.type,
      description: event.description,
      details: JSON.stringify(event.data || {}),
      createdAt: Date.now(),
    }).run()
  }

  return events
}
