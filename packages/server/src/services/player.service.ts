import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { players } from '../db/schema.js'

export function getPlayer(playerId: string) {
  const db = getDb()
  return db.select().from(players).where(eq(players.id, playerId)).get() || null
}

export function getRoomPlayers(roomId: string) {
  const db = getDb()
  return db.select().from(players).where(eq(players.roomId, roomId)).all()
}

export function getNonGmPlayers(roomId: string) {
  const db = getDb()
  return db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isGm, false)))
    .all()
}

export function updatePlayerStats(playerId: string, updates: {
  hp?: number
  hpMax?: number
  mp?: number
  mpMax?: number
  actionPoints?: number
  actionPointsMax?: number
}) {
  const db = getDb()
  db.update(players)
    .set({ ...updates, updatedAt: Date.now() })
    .where(eq(players.id, playerId))
    .run()
  return getPlayer(playerId)
}

export function updatePlayerRegion(playerId: string, regionId: string | null) {
  const db = getDb()
  db.update(players)
    .set({ regionId, updatedAt: Date.now() })
    .where(eq(players.id, playerId))
    .run()
}

export function bindPlayers(playerId1: string, playerId2: string) {
  const db = getDb()
  const now = Date.now()
  db.update(players)
    .set({ boundToPlayerId: playerId2, updatedAt: now })
    .where(eq(players.id, playerId1))
    .run()
  db.update(players)
    .set({ boundToPlayerId: playerId1, updatedAt: now })
    .where(eq(players.id, playerId2))
    .run()
}

export function unbindPlayer(playerId: string) {
  const db = getDb()
  const player = getPlayer(playerId)
  if (!player?.boundToPlayerId) return

  const now = Date.now()
  db.update(players)
    .set({ boundToPlayerId: null, updatedAt: now })
    .where(eq(players.id, playerId))
    .run()
  db.update(players)
    .set({ boundToPlayerId: null, updatedAt: now })
    .where(eq(players.id, player.boundToPlayerId))
    .run()
}

export function setCardMenuUnlocked(playerId: string, unlocked: boolean) {
  const db = getDb()
  db.update(players)
    .set({ cardMenuUnlocked: unlocked, updatedAt: Date.now() })
    .where(eq(players.id, playerId))
    .run()
}
