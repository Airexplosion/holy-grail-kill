import { v4 as uuid } from 'uuid'
import { eq, and, asc } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { outposts } from '../db/schema.js'
import * as gameService from './game.service.js'

export function placeOutpost(roomId: string, playerId: string, regionId: string, color: string) {
  const db = getDb()
  const room = gameService.getRoom(roomId)
  const maxOutposts = room?.config.maxOutpostsPerPlayer || 3

  const playerOutposts = db.select().from(outposts)
    .where(and(eq(outposts.roomId, roomId), eq(outposts.playerId, playerId)))
    .orderBy(asc(outposts.placedAt))
    .all()

  // Remove oldest if exceeding max
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

export function removeOutpost(outpostId: string) {
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
