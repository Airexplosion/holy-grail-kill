import { v4 as uuid } from 'uuid'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { rooms, players } from '../db/schema.js'
import { generateRoomCode } from '../utils/room-code.js'
import { signToken } from '../middleware/auth.js'
import { DEFAULT_ROOM_CONFIG, PLAYER_COLORS } from 'shared'
import type { CreateRoomInput } from 'shared'

export function createRoom(input: CreateRoomInput) {
  const db = getDb()
  const now = Date.now()

  let code: string
  let attempts = 0
  do {
    code = generateRoomCode()
    const existing = db.select().from(rooms).where(eq(rooms.code, code)).get()
    if (!existing) break
    attempts++
  } while (attempts < 10)

  if (attempts >= 10) {
    throw new Error('无法生成唯一房间码，请重试')
  }

  const roomId = uuid()
  const gmPlayerId = uuid()

  const room = {
    id: roomId,
    code,
    name: input.name,
    gmPlayerId,
    config: JSON.stringify(DEFAULT_ROOM_CONFIG),
    phase: 'round_start' as const,
    turnNumber: 0,
    currentActionPointIndex: 0,
    status: 'waiting' as const,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(rooms).values(room).run()

  const gmPlayer = {
    id: gmPlayerId,
    roomId,
    accountName: input.accountName,
    displayName: input.displayName || input.accountName,
    isGm: true,
    hp: 0,
    hpMax: 0,
    mp: 0,
    mpMax: 0,
    actionPoints: 0,
    actionPointsMax: 0,
    regionId: null,
    boundToPlayerId: null,
    status: 'connected' as const,
    cardMenuUnlocked: false,
    color: PLAYER_COLORS[0]!,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(players).values(gmPlayer).run()

  const token = signToken({
    playerId: gmPlayerId,
    roomId,
    isGm: true,
    accountName: input.accountName,
    accountId: '',
  })

  return { room, gmPlayer, token }
}

export function getRoomByCode(code: string) {
  const db = getDb()
  return db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).get() || null
}

export function getRoomPlayers(roomId: string) {
  const db = getDb()
  return db.select().from(players).where(eq(players.roomId, roomId)).all()
}
