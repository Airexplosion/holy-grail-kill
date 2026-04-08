import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { rooms, players } from '../db/schema.js'
import { getNextPhase, isLastPhase, isActionPhase } from '../engine/phase-machine.js'
import type { GamePhase, RoomConfig } from 'shared'

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

export function advancePhase(roomId: string): { phase: GamePhase; turnNumber: number } | null {
  const room = getRoom(roomId)
  if (!room) return null

  const next = getNextPhase(room.phase as GamePhase)
  const db = getDb()

  if (!next) {
    // End of round, go to next turn
    const newTurn = room.turnNumber + 1
    db.update(rooms).set({
      phase: 'round_start',
      turnNumber: newTurn,
      currentActionPointIndex: 0,
      updatedAt: Date.now(),
    }).where(eq(rooms.id, roomId)).run()

    return { phase: 'round_start', turnNumber: newTurn }
  }

  db.update(rooms).set({
    phase: next,
    currentActionPointIndex: next === 'action' ? 1 : 0,
    updatedAt: Date.now(),
  }).where(eq(rooms.id, roomId)).run()

  // Reset action points when entering action phase
  if (next === 'action') {
    const config = room.config
    const ap = config.defaultActionPoints || 4
    db.update(players).set({
      actionPoints: ap,
      actionPointsMax: ap,
      updatedAt: Date.now(),
    }).where(eq(players.roomId, roomId)).run()
  }

  return { phase: next, turnNumber: room.turnNumber }
}

export function setPhase(roomId: string, phase: GamePhase) {
  const db = getDb()
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
