import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import {
  C2S, S2C,
  combatPlayStrikeSchema, combatUseSkillSchema, combatRespondSchema, combatGmStartSchema,
} from 'shared'
import * as combatService from '../services/combat.service.js'
import * as logService from '../services/log.service.js'

export function registerCombatHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  requireGm: (socket: AuthenticatedSocket) => boolean,
  emitError: (socket: AuthenticatedSocket, message: string) => void,
) {
  const auth = socket.data.auth

  // GM starts combat
  socket.on(C2S.COMBAT_GM_START, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = combatGmStartSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const snapshot = combatService.startCombat(auth.roomId, parsed.data.participantIds)
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, snapshot)
      if (snapshot.activePlayerId) {
        io.to(roomKey).emit(S2C.COMBAT_TURN_START, { playerId: snapshot.activePlayerId, roundNumber: snapshot.roundNumber })
      }
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'combat', description: '战斗开始' })
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '战斗启动失败')
    }
  })

  // Player plays a strike card
  socket.on(C2S.COMBAT_PLAY_STRIKE, (data: unknown) => {
    const parsed = combatPlayStrikeSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.processAction(auth.roomId, auth.playerId, {
        type: 'play_strike',
        cardColor: parsed.data.cardColor,
        targetId: parsed.data.targetId,
      })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      io.to(roomKey).emit(S2C.COMBAT_CHAIN_UPDATE, { chain: result.snapshot.playChain })
      if (result.resolveResults.length > 0) {
        io.to(roomKey).emit(S2C.COMBAT_RESULT, { results: result.resolveResults })
      }
      emitEvents(io, roomKey, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '出牌失败')
    }
  })

  // Player uses a skill
  socket.on(C2S.COMBAT_USE_SKILL, (data: unknown) => {
    const parsed = combatUseSkillSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.processAction(auth.roomId, auth.playerId, {
        type: 'use_skill',
        skillId: parsed.data.skillId,
        targetId: parsed.data.targetId,
      })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      emitEvents(io, roomKey, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '技能使用失败')
    }
  })

  // Player responds (or passes response)
  socket.on(C2S.COMBAT_RESPOND, (data: unknown) => {
    const parsed = combatRespondSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.processAction(auth.roomId, auth.playerId, {
        type: 'respond',
        cardColor: parsed.data.cardColor,
      })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      io.to(roomKey).emit(S2C.COMBAT_CHAIN_UPDATE, { chain: result.snapshot.playChain })
      if (result.resolveResults.length > 0) {
        io.to(roomKey).emit(S2C.COMBAT_RESULT, { results: result.resolveResults })
      }
      emitEvents(io, roomKey, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '响应失败')
    }
  })

  // Player passes turn
  socket.on(C2S.COMBAT_PASS, () => {
    try {
      const result = combatService.processAction(auth.roomId, auth.playerId, { type: 'pass' })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      if (result.newRound) {
        io.to(roomKey).emit(S2C.COMBAT_ROUND_END, { roundNumber: result.snapshot.roundNumber - 1 })
      }
      if (result.snapshot.activePlayerId) {
        io.to(roomKey).emit(S2C.COMBAT_TURN_START, {
          playerId: result.snapshot.activePlayerId,
          roundNumber: result.snapshot.roundNumber,
        })
      }
      emitEvents(io, roomKey, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '操作失败')
    }
  })

  // GM forces next turn
  socket.on(C2S.COMBAT_GM_NEXT_TURN, () => {
    if (!requireGm(socket)) return
    try {
      const result = combatService.advanceTurn(auth.roomId)
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      if (result.newRound) {
        io.to(roomKey).emit(S2C.COMBAT_ROUND_END, { roundNumber: result.snapshot.roundNumber - 1 })
      }
      if (result.snapshot.activePlayerId) {
        io.to(roomKey).emit(S2C.COMBAT_TURN_START, {
          playerId: result.snapshot.activePlayerId,
          roundNumber: result.snapshot.roundNumber,
        })
      }
      emitEvents(io, roomKey, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '操作失败')
    }
  })

  // GM ends combat
  socket.on(C2S.COMBAT_GM_END, () => {
    if (!requireGm(socket)) return
    try {
      const result = combatService.stopCombat(auth.roomId)
      if (result) {
        io.to(roomKey).emit(S2C.COMBAT_ENDED, result.snapshot)
        emitEvents(io, roomKey, result.events)
        logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'combat', description: '战斗结束' })
      }
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '操作失败')
    }
  })
}

function emitEvents(io: Server, roomKey: string, events: Array<{ type: string; playerId: string; description: string; data?: Record<string, unknown> }>) {
  for (const event of events) {
    io.to(roomKey).emit(S2C.COMBAT_LOG_ENTRY, event)
  }
}
