import { v4 as uuid } from 'uuid'
import { eq, desc, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { operationLogs, rooms } from '../db/schema.js'
import type { GamePhase, LogCategory } from 'shared'

export function recordLog(params: {
  roomId: string
  playerId: string | null
  actionType: LogCategory | string
  description: string
  details?: Record<string, unknown>
}) {
  try {
    const db = getDb()
    const room = db.select().from(rooms).where(eq(rooms.id, params.roomId)).get()
    if (!room) return // skip log if room doesn't exist

    db.insert(operationLogs).values({
      id: uuid(),
      roomId: params.roomId,
      playerId: params.playerId,
      actionType: params.actionType,
      description: params.description,
      details: JSON.stringify(params.details || {}),
      phase: room.phase || 'round_start',
      turnNumber: room.turnNumber || 0,
      createdAt: Date.now(),
    }).run()
  } catch (err) {
    console.error('[Log] Failed to record log:', err)
  }
}

export function getLogs(roomId: string, options?: {
  limit?: number
  offset?: number
  playerId?: string
  actionType?: string
}) {
  const db = getDb()
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  let conditions = [eq(operationLogs.roomId, roomId)]
  if (options?.playerId) {
    conditions.push(eq(operationLogs.playerId, options.playerId))
  }
  if (options?.actionType) {
    conditions.push(eq(operationLogs.actionType, options.actionType))
  }

  const logs = db.select().from(operationLogs)
    .where(and(...conditions))
    .orderBy(desc(operationLogs.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  return logs.map(log => ({
    ...log,
    details: JSON.parse(log.details),
  }))
}
