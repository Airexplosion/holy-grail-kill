import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { env } from '../config/env.js'
import { socketAuthMiddleware, type AuthenticatedSocket } from './middleware.js'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { players } from '../db/schema.js'
import { C2S, S2C } from 'shared'
import * as gameService from '../services/game.service.js'
import * as mapService from '../services/map.service.js'
import * as playerService from '../services/player.service.js'
import * as cardService from '../services/card.service.js'
import * as actionService from '../services/action.service.js'
import * as outpostService from '../services/outpost.service.js'
import * as chatService from '../services/chat.service.js'
import * as logService from '../services/log.service.js'
import { filterMapForPlayer, buildPlayerSelfView } from '../engine/visibility.js'
import { registerDeckBuildHandlers } from './deck-build-handlers.js'
import { registerCombatHandlers } from './combat-handlers.js'
import { registerGroupHandlers } from './group-handlers.js'
import { registerCharacterHandlers } from './character-handlers.js'
import { z } from 'zod'
import {
  addRegionSchema, updateRegionSchema, setAdjacencySchema, removeAdjacencySchema, movePlayerSchema,
  cardDrawSchema, cardDiscardSchema, cardDrawSpecificSchema, cardRetrieveDiscardSchema, cardInsertSchema, cardTransferSchema, cardGmViewSchema, cardGmRemoveSchema,
  submitActionSchema, approveActionSchema,
  roomConfigSchema, updatePlayerStatsSchema, bindPlayersSchema,
  sendMessageSchema,
} from 'shared'

const playerIdSchema = z.object({ playerId: z.string().uuid() })
const regionIdSchema = z.object({ regionId: z.string().uuid() })
const phaseSetSchema = z.object({ phase: z.enum(['round_start', 'preparation', 'action', 'standby', 'combat', 'round_end']) })
const logQuerySchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
  playerId: z.string().optional(),
  actionType: z.string().optional(),
})

let io: Server | null = null

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  })

  io.use(socketAuthMiddleware)

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket
    const { auth } = socket.data
    const roomKey = `room:${auth.roomId}`

    socket.join(roomKey)

    if (auth.isGm) {
      socket.join(`${roomKey}:gm`)
    }

    // Join region sub-room for chat
    const player = playerService.getPlayer(auth.playerId)
    if (player?.regionId) {
      socket.join(`${roomKey}:region:${player.regionId}`)
    }

    // Send initial state
    sendInitialState(socket, auth)

    // Notify room
    socket.to(roomKey).emit(S2C.PLAYER_CONNECTED, {
      playerId: auth.playerId,
      accountName: auth.accountName,
      isGm: auth.isGm,
    })

    logService.recordLog({
      roomId: auth.roomId,
      playerId: auth.playerId,
      actionType: 'auth',
      description: `${auth.accountName} 加入了房间`,
    })

    // Register handlers
    registerGameHandlers(socket, roomKey)
    registerMapHandlers(socket, roomKey)
    registerCardHandlers(socket, roomKey)
    registerActionHandlers(socket, roomKey)
    registerChatHandlers(socket, roomKey)
    registerGmHandlers(socket, roomKey)
    registerGroupHandlers(socket, roomKey, io!, emitError)
    registerCharacterHandlers(socket, roomKey, io!, emitError)
    registerDeckBuildHandlers(socket, roomKey, io!, requireGm, emitError)
    registerCombatHandlers(socket, roomKey, io!, requireGm, emitError)

    socket.on('disconnect', () => {
      const db = getDb()
      db.update(players)
        .set({ status: 'disconnected', updatedAt: Date.now() })
        .where(eq(players.id, auth.playerId))
        .run()

      socket.to(roomKey).emit(S2C.PLAYER_DISCONNECTED, {
        playerId: auth.playerId,
      })

      logService.recordLog({
        roomId: auth.roomId,
        playerId: auth.playerId,
        actionType: 'auth',
        description: `${auth.accountName} 断开连接`,
      })
    })
  })

  return io
}

function sendInitialState(socket: AuthenticatedSocket, auth: { playerId: string; roomId: string; isGm: boolean }) {
  const room = gameService.getRoom(auth.roomId)
  if (!room) return

  const player = playerService.getPlayer(auth.playerId)
  if (!player) return

  // Room state
  const allPlayers = playerService.getRoomPlayers(auth.roomId)
  socket.emit(S2C.ROOM_STATE, {
    room: { ...room, config: room.config },
    players: auth.isGm
      ? allPlayers.map(p => ({
          ...p,
          ...cardService.getCardCounts(p.id),
        }))
      : allPlayers.map(p => ({
          id: p.id,
          displayName: p.displayName,
          color: p.color,
          status: p.status,
          isGm: p.isGm,
        })),
  })

  // Phase
  socket.emit(S2C.GAME_PHASE_CHANGED, {
    phase: room.phase,
    turnNumber: room.turnNumber,
  })

  // Map
  const fullMap = mapService.getFullMapState(auth.roomId)
  const knownSnapshots = auth.isGm ? undefined : outpostService.getKnownOutpostSnapshots(auth.playerId)
  const filteredMap = filterMapForPlayer(fullMap, {
    id: auth.playerId,
    regionId: player.regionId,
    isGm: auth.isGm,
  }, knownSnapshots)
  socket.emit(S2C.MAP_STATE, filteredMap)

  // Self stats
  if (!auth.isGm) {
    socket.emit(S2C.STATS_OWN, {
      hp: player.hp,
      hpMax: player.hpMax,
      mp: player.mp,
      mpMax: player.mpMax,
    })

    // Hand
    const hand = cardService.getHand(auth.playerId)
    const counts = cardService.getCardCounts(auth.playerId)
    socket.emit(S2C.CARD_HAND_UPDATED, { hand, deckCount: counts.deck, discardCount: counts.discard })
    socket.emit(S2C.CARD_MENU_STATUS, { unlocked: player.cardMenuUnlocked })

    // Action status
    socket.emit(S2C.ACTION_AP_UPDATE, { remainingAP: player.actionPoints })
  }

  // GM gets all player stats
  if (auth.isGm) {
    socket.emit(S2C.STATS_GM_VIEW_ALL, {
      players: allPlayers.map(p => ({
        ...p,
        handCount: cardService.getCardCounts(p.id).hand,
        deckCount: cardService.getCardCounts(p.id).deck,
        discardCount: cardService.getCardCounts(p.id).discard,
      })),
    })
  }
}

function broadcastMapUpdate(roomKey: string, roomId: string) {
  if (!io) return
  const fullMap = mapService.getFullMapState(roomId)
  const allPlayers = playerService.getRoomPlayers(roomId)
  const roomSockets = io.sockets.adapter.rooms.get(roomKey)
  if (!roomSockets) return

  for (const socketId of roomSockets) {
    const sock = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined
    if (!sock) continue
    const playerId = sock.data.auth.playerId
    const player = allPlayers.find(p => p.id === playerId)
    if (!player) continue

    const knownSnapshots = player.isGm ? undefined : outpostService.getKnownOutpostSnapshots(player.id)
    const filtered = filterMapForPlayer(fullMap, {
      id: player.id,
      regionId: player.regionId,
      isGm: player.isGm,
    }, knownSnapshots)
    sock.emit(S2C.MAP_UPDATED, filtered)
  }
}

function emitError(socket: AuthenticatedSocket, message: string) {
  socket.emit(S2C.ERROR, { message })
}

function requireGm(socket: AuthenticatedSocket): boolean {
  if (!socket.data.auth.isGm) {
    emitError(socket, '需要GM权限')
    return false
  }
  return true
}

function registerGameHandlers(socket: AuthenticatedSocket, roomKey: string) {
  const auth = socket.data.auth

  socket.on(C2S.GAME_START, () => {
    if (!requireGm(socket)) return
    const room = gameService.startGame(auth.roomId)
    if (room) {
      io?.to(roomKey).emit(S2C.GAME_PHASE_CHANGED, { phase: room.phase, turnNumber: room.turnNumber })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'phase', description: '游戏开始' })
    }
  })

  socket.on(C2S.GAME_PHASE_ADVANCE, () => {
    if (!requireGm(socket)) return
    const result = gameService.advancePhase(auth.roomId)
    if (result) {
      io?.to(roomKey).emit(S2C.GAME_PHASE_CHANGED, result)

      // If entering action phase, broadcast AP update to all players
      if (result.phase === 'action') {
        const allPlayers = playerService.getNonGmPlayers(auth.roomId)
        for (const p of allPlayers) {
          const updated = playerService.getPlayer(p.id)
          if (updated) {
            io?.to(roomKey).emit(S2C.ACTION_AP_UPDATE, { playerId: p.id, remainingAP: updated.actionPoints })
          }
        }
      }

      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'phase', description: `阶段推进至 ${result.phase}` })
    }
  })

  socket.on(C2S.GAME_PHASE_SET, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = phaseSetSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '无效的阶段'); return }
    gameService.setPhase(auth.roomId, parsed.data.phase)
    const room = gameService.getRoom(auth.roomId)
    if (room) {
      io?.to(roomKey).emit(S2C.GAME_PHASE_CHANGED, { phase: room.phase, turnNumber: room.turnNumber })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM强制设置阶段为 ${room.phase}` })
    }
  })

  socket.on(C2S.ROOM_CONFIG_UPDATE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = roomConfigSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const config = gameService.updateRoomConfig(auth.roomId, parsed.data)
    if (config) {
      io?.to(roomKey).emit(S2C.ROOM_CONFIG_UPDATED, { config })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: 'GM更新游戏配置', details: parsed.data })
    }
  })
}

function registerMapHandlers(socket: AuthenticatedSocket, roomKey: string) {
  const auth = socket.data.auth

  socket.on(C2S.MAP_REGION_ADD, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = addRegionSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const region = mapService.addRegion(auth.roomId, parsed.data.name, parsed.data.positionX, parsed.data.positionY, parsed.data.metadata)
    broadcastMapUpdate(roomKey, auth.roomId)
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'map', description: `添加区域: ${parsed.data.name}` })
  })

  socket.on(C2S.MAP_REGION_UPDATE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = updateRegionSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    mapService.updateRegion(parsed.data.regionId, parsed.data)
    broadcastMapUpdate(roomKey, auth.roomId)
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'map', description: `更新区域配置` })
  })

  socket.on(C2S.MAP_REGION_REMOVE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = regionIdSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    mapService.removeRegion(parsed.data.regionId)
    broadcastMapUpdate(roomKey, auth.roomId)
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'map', description: `删除区域` })
  })

  socket.on(C2S.MAP_ADJACENCY_SET, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = setAdjacencySchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    mapService.setAdjacency(auth.roomId, parsed.data.fromRegionId, parsed.data.toRegionId, parsed.data.type)
    broadcastMapUpdate(roomKey, auth.roomId)
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'map', description: `设置区域邻接关系: ${parsed.data.type}` })
  })

  socket.on(C2S.MAP_ADJACENCY_REMOVE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = removeAdjacencySchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    mapService.removeAdjacency(auth.roomId, parsed.data.fromRegionId, parsed.data.toRegionId)
    broadcastMapUpdate(roomKey, auth.roomId)
  })

  socket.on(C2S.MAP_PLAYER_MOVE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = movePlayerSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const oldPlayer = playerService.getPlayer(parsed.data.playerId)
    playerService.updatePlayerRegion(parsed.data.playerId, parsed.data.regionId)

    // Update socket rooms for chat
    if (oldPlayer?.regionId) {
      // We can't directly manage other sockets' rooms here, but the next map update will handle visibility
    }

    broadcastMapUpdate(roomKey, auth.roomId)
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM移动玩家到指定区域` })
  })
}

function registerCardHandlers(socket: AuthenticatedSocket, roomKey: string) {
  const auth = socket.data.auth

  socket.on(C2S.CARD_DRAW, (data: unknown) => {
    const parsed = cardDrawSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const drawn = cardService.drawCards(auth.playerId, parsed.data.count)
    const counts = cardService.getCardCounts(auth.playerId)
    socket.emit(S2C.CARD_DRAWN, { cards: drawn })
    socket.emit(S2C.CARD_HAND_UPDATED, { hand: cardService.getHand(auth.playerId), deckCount: counts.deck, discardCount: counts.discard })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'card', description: `抽了 ${parsed.data.count} 张牌` })
  })

  socket.on(C2S.CARD_DISCARD, (data: unknown) => {
    const parsed = cardDiscardSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    cardService.discardCards(auth.playerId, parsed.data.cardIds)
    const counts = cardService.getCardCounts(auth.playerId)
    socket.emit(S2C.CARD_HAND_UPDATED, { hand: cardService.getHand(auth.playerId), deckCount: counts.deck, discardCount: counts.discard })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'card', description: `弃了 ${parsed.data.cardIds.length} 张牌` })
  })

  socket.on(C2S.CARD_DRAW_SPECIFIC, (data: unknown) => {
    const parsed = cardDrawSpecificSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const card = cardService.drawSpecificCard(auth.playerId, parsed.data.cardId)
    if (!card) { emitError(socket, '卡牌不存在'); return }
    const counts = cardService.getCardCounts(auth.playerId)
    socket.emit(S2C.CARD_HAND_UPDATED, { hand: cardService.getHand(auth.playerId), deckCount: counts.deck, discardCount: counts.discard })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'card', description: `指定抽取了一张牌` })
  })

  socket.on(C2S.CARD_RETRIEVE_DISCARD, (data: unknown) => {
    const parsed = cardRetrieveDiscardSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const card = cardService.retrieveFromDiscard(auth.playerId, parsed.data.cardId)
    if (!card) { emitError(socket, '卡牌不存在'); return }
    const counts = cardService.getCardCounts(auth.playerId)
    socket.emit(S2C.CARD_HAND_UPDATED, { hand: cardService.getHand(auth.playerId), deckCount: counts.deck, discardCount: counts.discard })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'card', description: `从弃牌区检索了一张牌` })
  })

  socket.on(C2S.CARD_SHUFFLE_DECK, () => {
    cardService.shufflePlayerDeck(auth.playerId)
    socket.emit(S2C.CARD_OPERATION_RESULT, { success: true, message: '牌堆已洗牌' })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'card', description: '洗牌' })
  })

  socket.on(C2S.CARD_VIEW_DECK, () => {
    const deck = cardService.getDeck(auth.playerId)
    socket.emit(S2C.CARD_DECK_CONTENTS, { cards: deck })
  })
}

function registerActionHandlers(socket: AuthenticatedSocket, roomKey: string) {
  const auth = socket.data.auth

  socket.on(C2S.ACTION_SUBMIT, (data: unknown) => {
    const parsed = submitActionSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = actionService.submitAction(auth.roomId, auth.playerId, parsed.data.actionType, parsed.data.payload as any)

      socket.emit(S2C.ACTION_STATUS, { submitted: true })

      // Notify GM
      io?.to(`${roomKey}:gm`).emit(S2C.ACTION_SUBMITTED, {
        playerId: auth.playerId,
        action: result,
      })

      // Check if all submitted
      const status = actionService.getSubmissionStatus(auth.roomId)
      if (status.allSubmitted) {
        io?.to(`${roomKey}:gm`).emit(S2C.ACTION_ALL_SUBMITTED, { actions: status.actions })
      }

      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'action', description: `提交行动: ${parsed.data.actionType}`, details: parsed.data.payload as any })
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '提交失败')
    }
  })

  socket.on(C2S.ACTION_APPROVE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = approveActionSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const results = actionService.resolveActions(auth.roomId, parsed.data.actionPointIndex)
    io?.to(roomKey).emit(S2C.ACTION_RESOLVED, { results })

    // Update AP for all players
    const nonGm = playerService.getNonGmPlayers(auth.roomId)
    for (const p of nonGm) {
      const updated = playerService.getPlayer(p.id)
      if (updated) {
        io?.to(roomKey).emit(S2C.ACTION_AP_UPDATE, { playerId: p.id, remainingAP: updated.actionPoints })
      }
    }

    broadcastMapUpdate(roomKey, auth.roomId)
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM批准行动点 #${parsed.data.actionPointIndex}` })
  })

  socket.on(C2S.ACTION_NEXT_AP, () => {
    if (!requireGm(socket)) return
    const nextIdx = gameService.advanceActionPoint(auth.roomId)
    if (nextIdx) {
      io?.to(roomKey).emit(S2C.ACTION_STATUS, { submitted: false, currentAPIndex: nextIdx })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `推进到行动点 #${nextIdx}` })
    }
  })
}

function registerChatHandlers(socket: AuthenticatedSocket, roomKey: string) {
  const auth = socket.data.auth

  socket.on(C2S.CHAT_SEND, (data: unknown) => {
    const parsed = sendMessageSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const player = playerService.getPlayer(auth.playerId)
    if (!player?.regionId) { emitError(socket, '你不在任何区域'); return }

    const msg = chatService.sendMessage(auth.roomId, auth.playerId, player.regionId, parsed.data.content)
    io?.to(`${roomKey}:region:${player.regionId}`).emit(S2C.CHAT_MESSAGE, msg)

    // GM also receives all chat
    io?.to(`${roomKey}:gm`).emit(S2C.CHAT_MESSAGE, msg)
  })
}

function registerGmHandlers(socket: AuthenticatedSocket, roomKey: string) {
  const auth = socket.data.auth

  // Player stats modification
  socket.on(C2S.STATS_GM_UPDATE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = updatePlayerStatsSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const { playerId, ...stats } = parsed.data
    const updated = playerService.updatePlayerStats(playerId, stats)
    if (updated) {
      // Send updated stats to the target player
      io?.to(roomKey).emit(S2C.STATS_UPDATED, { playerId, hp: updated.hp, hpMax: updated.hpMax, mp: updated.mp, mpMax: updated.mpMax })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM修改玩家属性`, details: { targetPlayerId: playerId, ...stats } })
    }
  })

  // Card operations
  socket.on(C2S.CARD_MENU_UNLOCK, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = playerIdSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    playerService.setCardMenuUnlocked(parsed.data.playerId, true)
    io?.to(roomKey).emit(S2C.CARD_MENU_STATUS, { playerId: parsed.data.playerId, unlocked: true })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM解锁玩家卡牌菜单` })
  })

  socket.on(C2S.CARD_MENU_LOCK, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = playerIdSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    playerService.setCardMenuUnlocked(parsed.data.playerId, false)
    io?.to(roomKey).emit(S2C.CARD_MENU_STATUS, { playerId: parsed.data.playerId, unlocked: false })
  })

  socket.on(C2S.CARD_GM_VIEW, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = cardGmViewSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const allCards = cardService.getAllPlayerCards(parsed.data.playerId)
    const filtered = parsed.data.location
      ? allCards.filter(c => c.location === parsed.data.location)
      : allCards
    socket.emit(S2C.CARD_DECK_CONTENTS, { playerId: parsed.data.playerId, cards: filtered })
  })

  socket.on(C2S.CARD_GM_INSERT, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = cardInsertSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const room = gameService.getRoom(auth.roomId)
    if (!room) return

    cardService.insertCard(parsed.data.playerId, auth.roomId, {
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description || '',
      metadata: parsed.data.metadata,
      location: parsed.data.location,
      position: parsed.data.position,
    })

    // Send updated hand to target player
    const hand = cardService.getHand(parsed.data.playerId)
    const counts = cardService.getCardCounts(parsed.data.playerId)
    io?.to(roomKey).emit(S2C.CARD_HAND_UPDATED, { playerId: parsed.data.playerId, hand, deckCount: counts.deck, discardCount: counts.discard })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM插入卡牌: ${parsed.data.name}` })
  })

  socket.on(C2S.CARD_GM_TRANSFER, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = cardTransferSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    cardService.transferCards(parsed.data.fromPlayerId, parsed.data.toPlayerId, parsed.data.cardIds)

    // Update both players
    for (const pid of [parsed.data.fromPlayerId, parsed.data.toPlayerId]) {
      const hand = cardService.getHand(pid)
      const counts = cardService.getCardCounts(pid)
      io?.to(roomKey).emit(S2C.CARD_HAND_UPDATED, { playerId: pid, hand, deckCount: counts.deck, discardCount: counts.discard })
    }
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM转移卡牌` })
  })

  socket.on(C2S.CARD_GM_REMOVE, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = cardGmRemoveSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    cardService.removeCard(parsed.data.cardId)
    socket.emit(S2C.CARD_OPERATION_RESULT, { success: true, message: '卡牌已删除' })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM删除卡牌` })
  })

  // Player binding
  socket.on(C2S.PLAYER_BIND, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = bindPlayersSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    playerService.bindPlayers(parsed.data.playerId1, parsed.data.playerId2)
    io?.to(roomKey).emit(S2C.PLAYER_BOUND, { playerId1: parsed.data.playerId1, playerId2: parsed.data.playerId2, bound: true })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM绑定两名玩家` })
  })

  socket.on(C2S.PLAYER_UNBIND, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = playerIdSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    playerService.unbindPlayer(parsed.data.playerId)
    io?.to(roomKey).emit(S2C.PLAYER_BOUND, { playerId: parsed.data.playerId, bound: false })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'gm', description: `GM解除玩家绑定` })
  })

  // Operation log query
  socket.on(C2S.LOG_QUERY, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = logQuerySchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const logs = logService.getLogs(auth.roomId, parsed.data)
    socket.emit(S2C.LOG_HISTORY, { entries: logs })
  })
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}
