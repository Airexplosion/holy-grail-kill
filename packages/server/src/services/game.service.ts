import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { rooms, players } from '../db/schema.js'
import {
  getNextPhase, isLastPhase, isActionPhase,
  markGroupReady as phaseMarkReady,
  unmarkGroupReady as phaseUnmarkReady,
  resetReadiness, getReadyGroupIds,
  setPhaseTimeout, clearPhaseTimeout,
} from '../engine/phase-machine.js'
import * as groupService from './group.service.js'
import type { GamePhase, GameStage, RoomConfig } from 'shared'
import { triggerPhaseEffects } from '../engine/phase-effects.js'

export function getRoom(roomId: string) {
  const db = getDb()
  const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get()
  if (!room) return null
  return { ...room, config: JSON.parse(room.config) as RoomConfig }
}

export function startGame(roomId: string) {
  const db = getDb()
  db.update(rooms).set({
    status: 'active',
    phase: 'round_start',
    turnNumber: 1,
    currentActionPointIndex: 0,
    updatedAt: Date.now(),
  }).where(eq(rooms.id, roomId)).run()

  return getRoom(roomId)
}

/**
 * 推进到下一个阶段
 * 可由 GM 手动调用或由自动推进引擎调用
 */
export function advancePhase(roomId: string): { phase: GamePhase; turnNumber: number } | null {
  const room = getRoom(roomId)
  if (!room) return null

  const next = getNextPhase(room.phase as GamePhase)
  const db = getDb()

  // 清除超时和就绪状态
  clearPhaseTimeout(roomId)
  resetReadiness(roomId)
  groupService.resetAllGroupsReady(roomId)

  if (!next) {
    // round_end → 下一回合
    const newTurn = room.turnNumber + 1
    db.update(rooms).set({
      phase: 'round_start',
      turnNumber: newTurn,
      currentActionPointIndex: 0,
      updatedAt: Date.now(),
    }).where(eq(rooms.id, roomId)).run()

    // 触发回合开始阶段效果
    triggerPhaseEffects(roomId, 'round_start')
    return { phase: 'round_start', turnNumber: newTurn }
  }

  db.update(rooms).set({
    phase: next,
    currentActionPointIndex: next === 'action' ? 1 : 0,
    updatedAt: Date.now(),
  }).where(eq(rooms.id, roomId)).run()

  // 触发新阶段的入口效果
  triggerPhaseEffects(roomId, next, { defaultAP: room.config.defaultActionPoints })

  // 设置新阶段的超时自动推进
  const timeoutSeconds = room.config.phaseTimeoutSeconds
  if (timeoutSeconds && timeoutSeconds > 0) {
    setPhaseTimeout(roomId, timeoutSeconds * 1000, () => {
      // 超时强制推进
      advancePhase(roomId)
    })
  }

  return { phase: next, turnNumber: room.turnNumber }
}

/**
 * 标记组就绪，如果所有存活组都 ready 则自动推进
 * 返回 { ready: true, autoAdvanced: boolean, result? }
 */
export function markGroupReady(roomId: string, groupId: string): {
  ready: boolean
  autoAdvanced: boolean
  result?: { phase: GamePhase; turnNumber: number }
} {
  groupService.setGroupReady(groupId, true)

  const aliveGroupIds = groupService.getAliveGroups(roomId).map(g => g.id)
  const allReady = phaseMarkReady(roomId, groupId, aliveGroupIds)

  if (allReady) {
    const result = advancePhase(roomId)
    if (result) {
      return { ready: true, autoAdvanced: true, result }
    }
  }

  return { ready: true, autoAdvanced: false }
}

/**
 * 取消组就绪
 */
export function unmarkGroupReady(roomId: string, groupId: string): void {
  groupService.setGroupReady(groupId, false)
  phaseUnmarkReady(roomId, groupId)
}

/**
 * 获取就绪状态
 */
export function getReadyStatus(roomId: string): {
  readyGroupIds: string[]
  aliveGroupCount: number
} {
  return {
    readyGroupIds: getReadyGroupIds(roomId),
    aliveGroupCount: groupService.getAliveGroupCount(roomId),
  }
}

export function setPhase(roomId: string, phase: GamePhase) {
  const db = getDb()
  resetReadiness(roomId)
  clearPhaseTimeout(roomId)
  groupService.resetAllGroupsReady(roomId)

  db.update(rooms).set({
    phase,
    updatedAt: Date.now(),
  }).where(eq(rooms.id, roomId)).run()

  if (phase === 'action') {
    const room = getRoom(roomId)
    const ap = room?.config.defaultActionPoints || 4
    db.update(players).set({
      actionPoints: ap,
      actionPointsMax: ap,
      updatedAt: Date.now(),
    }).where(eq(players.roomId, roomId)).run()

    db.update(rooms).set({
      currentActionPointIndex: 1,
      updatedAt: Date.now(),
    }).where(eq(rooms.id, roomId)).run()
  }
}

export function updateRoomConfig(roomId: string, configUpdates: Partial<RoomConfig>) {
  const room = getRoom(roomId)
  if (!room) return null

  const newConfig = { ...room.config, ...configUpdates }
  const db = getDb()
  db.update(rooms).set({
    config: JSON.stringify(newConfig),
    updatedAt: Date.now(),
  }).where(eq(rooms.id, roomId)).run()

  return newConfig
}

export function advanceActionPoint(roomId: string) {
  const db = getDb()
  const room = getRoom(roomId)
  if (!room) return null

  const next = room.currentActionPointIndex + 1
  db.update(rooms).set({
    currentActionPointIndex: next,
    updatedAt: Date.now(),
  }).where(eq(rooms.id, roomId)).run()

  return next
}

export function setGameStage(roomId: string, stage: GameStage) {
  const db = getDb()
  // GameStage 存在 room.config.customRules 中（或未来添加专用列）
  const room = getRoom(roomId)
  if (!room) return

  const newConfig = { ...room.config, customRules: { ...room.config.customRules, gameStage: stage } }
  db.update(rooms).set({
    config: JSON.stringify(newConfig),
    updatedAt: Date.now(),
  }).where(eq(rooms.id, roomId)).run()
}

export function getGameStage(roomId: string): GameStage {
  const room = getRoom(roomId)
  if (!room) return 'lobby'
  return (room.config.customRules?.gameStage as GameStage) || 'lobby'
}
