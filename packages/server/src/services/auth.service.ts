import { v4 as uuid } from 'uuid'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { players, rooms } from '../db/schema.js'
import { signToken, verifyToken, type AuthPayload } from '../middleware/auth.js'
import { AppError } from '../middleware/error-handler.js'
import { PLAYER_COLORS, DEFAULTS } from 'shared'
import type { LoginInput } from 'shared'

export async function login(input: LoginInput) {
  const db = getDb()
  const now = Date.now()

  const room = db.select().from(rooms).where(eq(rooms.code, input.roomCode.toUpperCase())).get()
  if (!room) {
    throw new AppError(404, '房间不存在')
  }

  const existingPlayer = db.select().from(players)
    .where(and(
      eq(players.accountName, input.accountName),
      eq(players.roomId, room.id),
    ))
    .get()

  if (existingPlayer) {
    db.update(players)
      .set({ status: 'connected', updatedAt: now })
      .where(eq(players.id, existingPlayer.id))
      .run()

    return {
      token: '', // token will be issued by the route handler with accountId
      player: { ...existingPlayer, status: 'connected' as const, updatedAt: now },
      room,
      isReconnect: true,
    }
  }

  const roomPlayers = db.select().from(players).where(eq(players.roomId, room.id)).all()
  const config = JSON.parse(room.config)
  const maxPlayers = config.maxPlayers || DEFAULTS.MAX_PLAYERS
  if (roomPlayers.length >= maxPlayers) {
    throw new AppError(400, `房间已满（${maxPlayers}人上限）`)
  }

  const colorIndex = roomPlayers.length % PLAYER_COLORS.length
  const playerId = uuid()

  const newPlayer = {
    id: playerId,
    roomId: room.id,
    accountName: input.accountName,
    displayName: input.displayName || input.accountName,
    isGm: false,
    hp: config.defaultHp || DEFAULTS.HP,
    hpMax: config.defaultHpMax || DEFAULTS.HP_MAX,
    mp: config.defaultMp || DEFAULTS.MP,
    mpMax: config.defaultMpMax || DEFAULTS.MP_MAX,
    actionPoints: config.defaultActionPoints || DEFAULTS.ACTION_POINTS,
    actionPointsMax: config.defaultActionPoints || DEFAULTS.ACTION_POINTS,
    regionId: null,
    boundToPlayerId: null,
    status: 'connected' as const,
    cardMenuUnlocked: false,
    color: PLAYER_COLORS[colorIndex]!,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(players).values(newPlayer).run()

  return { token: '', player: newPlayer, room, isReconnect: false }
}

export function reconnect(token: string) {
  const payload = verifyToken(token) as any
  if (!payload || !payload.playerId) {
    throw new AppError(401, '令牌无效或已过期')
  }

  const db = getDb()
  const player = db.select().from(players).where(eq(players.id, payload.playerId)).get()
  if (!player) {
    throw new AppError(404, '玩家不存在')
  }

  const room = db.select().from(rooms).where(eq(rooms.id, payload.roomId)).get()
  if (!room) {
    throw new AppError(404, '房间不存在')
  }

  const now = Date.now()
  db.update(players)
    .set({ status: 'connected', updatedAt: now })
    .where(eq(players.id, player.id))
    .run()

  const newToken = signToken({
    playerId: player.id,
    roomId: room.id,
    isGm: player.isGm,
    accountName: player.accountName,
    accountId: payload.accountId || '',
  })
  return { token: newToken, player: { ...player, status: 'connected' as const }, room }
}
