import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { accountAuthMiddleware, signToken } from '../middleware/auth.js'
import { createRoomSchema } from 'shared'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { rooms, players } from '../db/schema.js'
import * as roomService from '../services/room.service.js'

const router = Router()

// Create room (requires account token)
router.post('/', accountAuthMiddleware, validate(createRoomSchema), (req, res, next) => {
  try {
    const auth = (req as any).auth
    const result = roomService.createRoom({
      ...req.body,
      accountName: auth.username || req.body.accountName,
      displayName: req.body.displayName || auth.displayName,
    })

    // Issue game token for GM
    const gameToken = signToken({
      playerId: result.gmPlayer.id,
      roomId: result.room.id,
      isGm: true,
      accountName: auth.username,
      accountId: auth.accountId,
    })

    res.json({ success: true, data: { ...result, token: gameToken } })
  } catch (err) {
    next(err)
  }
})

// Get room info by code
router.get('/by-code/:code', (req, res, next) => {
  try {
    const room = roomService.getRoomByCode(req.params.code!)
    if (!room) {
      res.status(404).json({ success: false, error: '房间不存在' })
      return
    }
    const playerCount = roomService.getRoomPlayers(room.id).length
    res.json({
      success: true,
      data: {
        id: room.id,
        code: room.code,
        name: room.name,
        status: room.status,
        playerCount,
        phase: room.phase,
        turnNumber: room.turnNumber,
      },
    })
  } catch (err) {
    next(err)
  }
})

// List all public rooms (lobby)
router.get('/lobby', (_req, res, next) => {
  try {
    const db = getDb()
    const allRooms = db.select().from(rooms).all()

    const roomList = allRooms.map((room) => {
      const playerCount = db.select().from(players)
        .where(eq(players.roomId, room.id))
        .all().length

      const config = JSON.parse(room.config)
      return {
        id: room.id,
        code: room.code,
        name: room.name,
        status: room.status,
        playerCount,
        maxPlayers: config.maxPlayers || 28,
        phase: room.phase,
        turnNumber: room.turnNumber,
        createdAt: room.createdAt,
      }
    })

    res.json({ success: true, data: roomList })
  } catch (err) {
    next(err)
  }
})

// Get my rooms (rooms this account has joined)
router.get('/my-rooms', accountAuthMiddleware, (req, res, next) => {
  try {
    const auth = (req as any).auth
    const username = auth.username || auth.accountName
    const db = getDb()

    const myPlayers = db.select().from(players)
      .where(eq(players.accountName, username))
      .all()

    const myRooms = myPlayers.map((p) => {
      const room = db.select().from(rooms).where(eq(rooms.id, p.roomId)).get()
      if (!room) return null

      const playerCount = db.select().from(players)
        .where(eq(players.roomId, room.id))
        .all().length

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        status: room.status,
        playerCount,
        phase: room.phase,
        turnNumber: room.turnNumber,
        isGm: p.isGm,
        playerId: p.id,
        playerDisplayName: p.displayName,
        createdAt: room.createdAt,
      }
    }).filter(Boolean)

    res.json({ success: true, data: myRooms })
  } catch (err) {
    next(err)
  }
})

export default router
