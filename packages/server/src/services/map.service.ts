import { v4 as uuid } from 'uuid'
import { eq, and, or } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { regions, adjacencies, players, outposts } from '../db/schema.js'
import type { MapState, PlayerPosition, OutpostMarker, Adjacency } from 'shared'

export function addRegion(roomId: string, name: string, posX = 0, posY = 0, metadata: Record<string, unknown> = {}) {
  const db = getDb()
  const id = uuid()
  db.insert(regions).values({
    id,
    roomId,
    name,
    positionX: posX,
    positionY: posY,
    metadata: JSON.stringify(metadata),
  }).run()
  return getRegion(id)!
}

export function updateRegion(regionId: string, updates: {
  name?: string
  positionX?: number
  positionY?: number
  metadata?: Record<string, unknown>
}) {
  const db = getDb()
  const setObj: Record<string, unknown> = {}
  if (updates.name !== undefined) setObj.name = updates.name
  if (updates.positionX !== undefined) setObj.positionX = updates.positionX
  if (updates.positionY !== undefined) setObj.positionY = updates.positionY
  if (updates.metadata !== undefined) setObj.metadata = JSON.stringify(updates.metadata)

  db.update(regions).set(setObj).where(eq(regions.id, regionId)).run()
  return getRegion(regionId)
}

export function removeRegion(regionId: string) {
  const db = getDb()
  db.delete(adjacencies).where(
    or(eq(adjacencies.fromRegionId, regionId), eq(adjacencies.toRegionId, regionId)),
  ).run()
  db.delete(outposts).where(eq(outposts.regionId, regionId)).run()
  db.update(players).set({ regionId: null }).where(eq(players.regionId, regionId)).run()
  db.delete(regions).where(eq(regions.id, regionId)).run()
}

export function getRegion(regionId: string) {
  const db = getDb()
  const r = db.select().from(regions).where(eq(regions.id, regionId)).get()
  if (!r) return null
  return { ...r, metadata: JSON.parse(r.metadata) }
}

export function getRoomRegions(roomId: string) {
  const db = getDb()
  return db.select().from(regions).where(eq(regions.roomId, roomId)).all()
    .map(r => ({ ...r, metadata: JSON.parse(r.metadata) }))
}

export function setAdjacency(roomId: string, fromRegionId: string, toRegionId: string, type: 'bidirectional' | 'unidirectional' | 'blocked') {
  const db = getDb()
  // Remove existing adjacency in both directions
  removeAdjacency(roomId, fromRegionId, toRegionId)

  db.insert(adjacencies).values({
    id: uuid(),
    roomId,
    fromRegionId,
    toRegionId,
    type,
  }).run()
}

export function removeAdjacency(roomId: string, fromRegionId: string, toRegionId: string) {
  const db = getDb()
  db.delete(adjacencies).where(
    and(
      eq(adjacencies.roomId, roomId),
      or(
        and(eq(adjacencies.fromRegionId, fromRegionId), eq(adjacencies.toRegionId, toRegionId)),
        and(eq(adjacencies.fromRegionId, toRegionId), eq(adjacencies.toRegionId, fromRegionId)),
      ),
    ),
  ).run()
}

export function getRoomAdjacencies(roomId: string) {
  const db = getDb()
  return db.select().from(adjacencies).where(eq(adjacencies.roomId, roomId)).all()
}

export function getFullMapState(roomId: string): MapState {
  const regionList = getRoomRegions(roomId)
  const adjacencyList = getRoomAdjacencies(roomId) as Adjacency[]

  const db = getDb()
  const allPlayers = db.select().from(players)
    .where(and(eq(players.roomId, roomId), eq(players.isGm, false)))
    .all()

  const playerPositions: PlayerPosition[] = allPlayers
    .filter(p => p.regionId !== null)
    .map(p => ({
      playerId: p.id,
      displayName: p.displayName,
      regionId: p.regionId!,
      color: p.color,
    }))

  const outpostList = db.select().from(outposts).where(eq(outposts.roomId, roomId)).all()
  const outpostMarkers: OutpostMarker[] = outpostList.map(o => {
    const owner = allPlayers.find(p => p.id === o.playerId)
    return {
      id: o.id,
      playerId: o.playerId,
      displayName: owner?.displayName || '未知',
      regionId: o.regionId,
      color: o.color,
      placedAt: o.placedAt,
    }
  })

  return {
    regions: regionList,
    adjacencies: adjacencyList,
    playerPositions,
    outposts: outpostMarkers,
  }
}
