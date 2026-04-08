import { v4 as uuid } from 'uuid'
import { eq, and, asc } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { outposts, knownOutposts, players } from '../db/schema.js'
import * as gameService from './game.service.js'
import type { OutpostMarker } from 'shared'

export function placeOutpost(roomId: string, playerId: string, regionId: string, color: string) {
  const db = getDb()
  const room = gameService.getRoom(roomId)
  const maxOutposts = room?.config.maxOutpostsPerPlayer || 3

  const playerOutposts = db.select().from(outposts)
    .where(and(eq(outposts.roomId, roomId), eq(outposts.playerId, playerId)))
    .orderBy(asc(outposts.placedAt))
    .all()

  // Remove oldest if exceeding max (don't clean known_outposts — stale info stays)
  if (playerOutposts.length >= maxOutposts) {
    const toRemove = playerOutposts.slice(0, playerOutposts.length - maxOutposts + 1)
    for (const o of toRemove) {
      db.delete(outposts).where(eq(outposts.id, o.id)).run()
    }
  }

  const id = uuid()
  db.insert(outposts).values({
    id,
    roomId,
    playerId,
    regionId,
    color,
    placedAt: Date.now(),
  }).run()

  return { id, roomId, playerId, regionId, color, placedAt: Date.now() }
}

export function destroyOutpost(outpostId: string) {
  const db = getDb()
  db.delete(outposts).where(eq(outposts.id, outpostId)).run()
}

export function getPlayerOutposts(roomId: string, playerId: string) {
  const db = getDb()
  return db.select().from(outposts)
    .where(and(eq(outposts.roomId, roomId), eq(outposts.playerId, playerId)))
    .all()
}

export function getRoomOutposts(roomId: string) {
  const db = getDb()
  return db.select().from(outposts).where(eq(outposts.roomId, roomId)).all()
}

export function getOutpost(outpostId: string) {
  const db = getDb()
  return db.select().from(outposts).where(eq(outposts.id, outpostId)).get() || null
}

/** Save a snapshot of outpost info into the viewer's known set */
function saveOutpostSnapshot(viewerPlayerId: string, outpost: {
  id: string; playerId: string; regionId: string; color: string
}, ownerDisplayName: string) {
  const db = getDb()
  db.insert(knownOutposts).values({
    id: uuid(),
    playerId: viewerPlayerId,
    outpostId: outpost.id,
    ownerPlayerId: outpost.playerId,
    ownerDisplayName,
    regionId: outpost.regionId,
    color: outpost.color,
    discoveredAt: Date.now(),
  }).onConflictDoNothing().run()
}

/** When a player scouts a region, they discover all outposts currently there */
export function discoverOutpostsInRegion(viewerPlayerId: string, regionId: string, roomId: string) {
  const db = getDb()
  const regionOutposts = db.select().from(outposts)
    .where(and(eq(outposts.roomId, roomId), eq(outposts.regionId, regionId)))
    .all()

  const allPlayers = db.select().from(players)
    .where(eq(players.roomId, roomId))
    .all()

  for (const o of regionOutposts) {
    if (o.playerId === viewerPlayerId) continue // own outposts don't need snapshots
    const owner = allPlayers.find(p => p.id === o.playerId)
    saveOutpostSnapshot(viewerPlayerId, o, owner?.displayName || '未知')
  }
}

/** When an outpost is placed, all players in the same region discover it */
export function discoverOutpostForPlayersInRegion(
  outpost: { id: string; playerId: string; regionId: string; color: string },
  ownerDisplayName: string,
  witnessPlayerIds: readonly string[],
) {
  for (const pid of witnessPlayerIds) {
    saveOutpostSnapshot(pid, outpost, ownerDisplayName)
  }
}

/** When a player destroys an outpost, remove it from their known set (they now know it's gone) */
export function clearKnownOutpost(viewerPlayerId: string, outpostId: string) {
  const db = getDb()
  db.delete(knownOutposts)
    .where(and(eq(knownOutposts.playerId, viewerPlayerId), eq(knownOutposts.outpostId, outpostId)))
    .run()
}

/** Get all outpost snapshots a player has discovered (may include destroyed ones) */
export function getKnownOutpostSnapshots(playerId: string): OutpostMarker[] {
  const db = getDb()
  return db.select().from(knownOutposts)
    .where(eq(knownOutposts.playerId, playerId))
    .all()
    .map(r => ({
      id: r.outpostId,
      playerId: r.ownerPlayerId,
      displayName: r.ownerDisplayName,
      regionId: r.regionId,
      color: r.color,
      placedAt: r.discoveredAt,
    }))
}
