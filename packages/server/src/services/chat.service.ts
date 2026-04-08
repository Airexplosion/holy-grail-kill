import { v4 as uuid } from 'uuid'
import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { chatMessages, players } from '../db/schema.js'

export function sendMessage(roomId: string, playerId: string, regionId: string, content: string) {
  const db = getDb()
  const player = db.select().from(players).where(eq(players.id, playerId)).get()
  if (!player) throw new Error('玩家不存在')

  const id = uuid()
  const msg = {
    id,
    roomId,
    playerId,
    senderName: player.displayName,
    regionId,
    content,
    createdAt: Date.now(),
  }

  db.insert(chatMessages).values({
    id,
    roomId,
    playerId,
    regionId,
    content,
    createdAt: msg.createdAt,
  }).run()

  return msg
}

export function getRegionHistory(roomId: string, regionId: string, limit = 50) {
  const db = getDb()
  const msgs = db.select().from(chatMessages)
    .where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.regionId, regionId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .all()

  const playerMap = new Map<string, string>()
  for (const msg of msgs) {
    if (!playerMap.has(msg.playerId)) {
      const p = db.select().from(players).where(eq(players.id, msg.playerId)).get()
      if (p) playerMap.set(msg.playerId, p.displayName)
    }
  }

  return msgs.reverse().map(msg => ({
    ...msg,
    senderName: playerMap.get(msg.playerId) || '未知',
  }))
}
