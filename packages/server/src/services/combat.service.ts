/**
 * 战斗服务 — 封装战斗引擎，提供 DB 持久化和对外接口
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

/** In-memory combat state per room */
const activeCombats = new Map<string, CombatEngineState>()

export function startCombat(roomId: string, participantIds: string[]) {
  const allSkills = skillLibraryService.getAllSkills()
  const skillMap = new Map(allSkills.map(s => [s.id, s]))

  const participants = participantIds.map(pid => {
    const player = playerService.getPlayer(pid)
    if (!player) throw new Error(`玩家 ${pid} 不存在`)

    const build = deckBuildService.getDeckBuild(roomId, pid)
    if (!build.isLocked) throw new Error(`玩家 ${player.displayName} 未锁定配置`)

    // Build runtime skills
    const skills = build.skillIds
      .map(id => skillMap.get(id))
      .filter(Boolean)
      .map(entry => createRuntimeSkill(entry!))

    // Build strike card hand
    const hand = new Map<StrikeColor, number>([
      ['red', build.strikeCards.red],
      ['blue', build.strikeCards.blue],
      ['green', build.strikeCards.green],
    ])

    return {
      id: pid,
      hp: player.hp,
      hpMax: player.hpMax,
      mp: player.mp,
      mpMax: player.mpMax,
      skills,
      hand,
    }
  })

  const state = initCombat(roomId, participants)
  activeCombats.set(roomId, state)

  // Persist initial state
  persistState(state)

  return getSnapshot(state)
}

export function processAction(roomId: string, playerId: string, action: CombatAction) {
  const state = activeCombats.get(roomId)
  if (!state || !state.isActive) throw new Error('没有进行中的战斗')

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

  // Auto-resolve if phase is resolve
  let resolveResults: any[] = []
  if (state.phase === 'resolve') {
    resolveResults = resolveChain(state)
  }

  // Auto-advance turn if phase is end_turn
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

export function advanceTurn(roomId: string) {
  const state = activeCombats.get(roomId)
  if (!state || !state.isActive) throw new Error('没有进行中的战斗')

  // Force clear chain and advance
  state.playChain = []
  const { newRound } = nextTurn(state)
  persistState(state)

  return { snapshot: getSnapshot(state), newRound, events: drainEvents(state) }
}

export function stopCombat(roomId: string) {
  const state = activeCombats.get(roomId)
  if (!state) return null

  endCombat(state)
  persistState(state)

  // Sync HP/MP back to player records
  for (const [pid, ps] of state.playerStates) {
    playerService.updatePlayerStats(pid, { hp: ps.hp, mp: ps.mp })
  }

  activeCombats.delete(roomId)
  return { snapshot: getSnapshot(state), events: drainEvents(state) }
}

export function getCombatState(roomId: string) {
  const state = activeCombats.get(roomId)
  if (!state) return null
  return getSnapshot(state)
}

export function isInCombat(roomId: string): boolean {
  const state = activeCombats.get(roomId)
  return !!state?.isActive
}

// ===== Helpers =====

function persistState(state: CombatEngineState) {
  const db = getDb()
  const now = Date.now()
  const id = `combat_${state.roomId}`

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

  const existing = db.select().from(combatStates).where(eq(combatStates.id, id)).get()
  if (existing) {
    db.update(combatStates).set(values).where(eq(combatStates.id, id)).run()
  } else {
    db.insert(combatStates).values({ id, ...values, startedAt: now }).run()
  }
}

function drainEvents(state: CombatEngineState) {
  const events = [...state.events]
  state.events = []

  // Also persist to combat_logs
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
