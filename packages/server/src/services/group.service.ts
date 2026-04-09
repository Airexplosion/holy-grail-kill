import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { groups, players } from '../db/schema.js'
import type { Group, GroupStatus } from 'shared'
import { INITIAL_SECRET_KEYS } from 'shared'

export function createGroup(
  roomId: string,
  masterPlayerId: string,
  servantPlayerId: string,
  name: string,
  color: string,
): Group {
  const db = getDb()
  const now = Date.now()
  const id = uuid()

  db.insert(groups).values({
    id,
    roomId,
    name,
    color,
    masterPlayerId,
    servantPlayerId,
    secretKeysRemaining: INITIAL_SECRET_KEYS,
    status: 'alive',
    akashaKeyHolder: false,
    magicChannelProgress: 0,
    isReady: false,
    createdAt: now,
    updatedAt: now,
  }).run()

  // Update player records with group binding
  db.update(players).set({ boundToPlayerId: servantPlayerId, updatedAt: now })
    .where(eq(players.id, masterPlayerId)).run()
  db.update(players).set({ boundToPlayerId: masterPlayerId, updatedAt: now })
    .where(eq(players.id, servantPlayerId)).run()

  return getGroup(id)!
}

export function getGroup(groupId: string): Group | null {
  const db = getDb()
  const row = db.select().from(groups).where(eq(groups.id, groupId)).get()
  if (!row) return null
  return rowToGroup(row)
}

export function getRoomGroups(roomId: string): Group[] {
  const db = getDb()
  const rows = db.select().from(groups).where(eq(groups.roomId, roomId)).all()
  return rows.map(rowToGroup)
}

export function getAliveGroups(roomId: string): Group[] {
  const db = getDb()
  const rows = db.select().from(groups)
    .where(and(eq(groups.roomId, roomId), eq(groups.status, 'alive')))
    .all()
  return rows.map(rowToGroup)
}

export function getAliveGroupCount(roomId: string): number {
  return getAliveGroups(roomId).length
}

export function getPlayerGroup(playerId: string): Group | null {
  const db = getDb()
  // Check as master first, then as servant
  let row = db.select().from(groups).where(eq(groups.masterPlayerId, playerId)).get()
  if (!row) {
    row = db.select().from(groups).where(eq(groups.servantPlayerId, playerId)).get()
  }
  if (!row) return null
  return rowToGroup(row)
}

export function setGroupReady(groupId: string, ready: boolean): void {
  const db = getDb()
  db.update(groups).set({
    isReady: ready,
    updatedAt: Date.now(),
  }).where(eq(groups.id, groupId)).run()
}

export function areAllAliveGroupsReady(roomId: string): boolean {
  const alive = getAliveGroups(roomId)
  return alive.length > 0 && alive.every(g => g.isReady)
}

export function resetAllGroupsReady(roomId: string): void {
  const db = getDb()
  db.update(groups).set({
    isReady: false,
    updatedAt: Date.now(),
  }).where(eq(groups.roomId, roomId)).run()
}

export function eliminateGroup(groupId: string): void {
  const db = getDb()
  db.update(groups).set({
    status: 'eliminated' as GroupStatus,
    updatedAt: Date.now(),
  }).where(eq(groups.id, groupId)).run()
}

export function eliminateServant(groupId: string): void {
  const db = getDb()
  db.update(groups).set({
    status: 'servant_eliminated' as GroupStatus,
    updatedAt: Date.now(),
  }).where(eq(groups.id, groupId)).run()
}

export function useSecretKey(groupId: string): boolean {
  const group = getGroup(groupId)
  if (!group || group.secretKeysRemaining <= 0) return false

  const db = getDb()
  db.update(groups).set({
    secretKeysRemaining: group.secretKeysRemaining - 1,
    updatedAt: Date.now(),
  }).where(eq(groups.id, groupId)).run()

  return true
}

export function setAkashaKeyHolder(groupId: string, holding: boolean): void {
  const db = getDb()
  db.update(groups).set({
    akashaKeyHolder: holding,
    updatedAt: Date.now(),
  }).where(eq(groups.id, groupId)).run()
}

export function addChannelProgress(groupId: string, points: number): number {
  const group = getGroup(groupId)
  if (!group) return 0

  const newProgress = group.magicChannelProgress + points
  const db = getDb()
  db.update(groups).set({
    magicChannelProgress: newProgress,
    updatedAt: Date.now(),
  }).where(eq(groups.id, groupId)).run()

  return newProgress
}

function rowToGroup(row: typeof groups.$inferSelect): Group {
  return {
    id: row.id,
    roomId: row.roomId,
    name: row.name,
    color: row.color,
    masterPlayerId: row.masterPlayerId,
    servantPlayerId: row.servantPlayerId,
    secretKeysRemaining: row.secretKeysRemaining,
    status: row.status as GroupStatus,
    akashaKeyHolder: row.akashaKeyHolder,
    magicChannelProgress: row.magicChannelProgress,
    isReady: row.isReady,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
