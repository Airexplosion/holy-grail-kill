import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import {
  C2S, S2C,
  combatPlayStrikeSchema, combatUseSkillSchema, combatRespondSchema, combatGmStartSchema,
} from 'shared'
import * as combatService from '../services/combat.service.js'
import * as logService from '../services/log.service.js'
import { z } from 'zod'

const combatIdSchema = z.object({ combatId: z.string() })

export function registerCombatHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  requireGm: (socket: AuthenticatedSocket) => boolean,
  emitError: (socket: AuthenticatedSocket, message: string) => void,
) {
  const auth = socket.data.auth

  // GM starts a combat (returns combatId)
  socket.on(C2S.COMBAT_GM_START, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = combatGmStartSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const snapshot = combatService.startCombat(auth.roomId, parsed.data.participantIds)
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, snapshot)
      if (snapshot.activePlayerId) {
        io.to(roomKey).emit(S2C.COMBAT_TURN_START, {
          combatId: snapshot.combatId,
          playerId: snapshot.activePlayerId,
          roundNumber: snapshot.roundNumber,
        })
      }
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'combat', description: `战斗开始 (${snapshot.combatId.slice(0, 8)})` })
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '战斗启动失败')
    }
  })

  // Player plays a strike card
  socket.on(C2S.COMBAT_PLAY_STRIKE, (data: unknown) => {
    const parsed = combatPlayStrikeSchema.extend({ combatId: z.string() }).safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.processAction(parsed.data.combatId, auth.playerId, {
        type: 'play_strike',
        cardColor: parsed.data.cardColor,
        targetId: parsed.data.targetId,
      })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      io.to(roomKey).emit(S2C.COMBAT_CHAIN_UPDATE, { combatId: parsed.data.combatId, chain: result.snapshot.playChain })
      if (result.resolveResults.length > 0) {
        io.to(roomKey).emit(S2C.COMBAT_RESULT, { combatId: parsed.data.combatId, results: result.resolveResults })
      }
      emitEvents(io, roomKey, parsed.data.combatId, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '出牌失败')
    }
  })

  // Player uses a skill
  socket.on(C2S.COMBAT_USE_SKILL, (data: unknown) => {
    const parsed = combatUseSkillSchema.extend({ combatId: z.string() }).safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.processAction(parsed.data.combatId, auth.playerId, {
        type: 'use_skill',
        skillId: parsed.data.skillId,
        targetId: parsed.data.targetId,
      })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      emitEvents(io, roomKey, parsed.data.combatId, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '技能使用失败')
    }
  })

  // Player responds
  socket.on(C2S.COMBAT_RESPOND, (data: unknown) => {
    const parsed = combatRespondSchema.extend({ combatId: z.string() }).safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.processAction(parsed.data.combatId, auth.playerId, {
        type: 'respond',
        cardColor: parsed.data.cardColor,
      })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      io.to(roomKey).emit(S2C.COMBAT_CHAIN_UPDATE, { combatId: parsed.data.combatId, chain: result.snapshot.playChain })
      if (result.resolveResults.length > 0) {
        io.to(roomKey).emit(S2C.COMBAT_RESULT, { combatId: parsed.data.combatId, results: result.resolveResults })
      }
      emitEvents(io, roomKey, parsed.data.combatId, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '响应失败')
    }
  })

  // Player passes turn
  socket.on(C2S.COMBAT_PASS, (data: unknown) => {
    const parsed = combatIdSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.processAction(parsed.data.combatId, auth.playerId, { type: 'pass' })
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      if (result.newRound) {
        io.to(roomKey).emit(S2C.COMBAT_ROUND_END, { combatId: parsed.data.combatId, roundNumber: result.snapshot.roundNumber - 1 })
      }
      if (result.snapshot.activePlayerId) {
        io.to(roomKey).emit(S2C.COMBAT_TURN_START, {
          combatId: parsed.data.combatId,
          playerId: result.snapshot.activePlayerId,
          roundNumber: result.snapshot.roundNumber,
        })
      }
      emitEvents(io, roomKey, parsed.data.combatId, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '操作失败')
    }
  })

  // GM forces next turn
  socket.on(C2S.COMBAT_GM_NEXT_TURN, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = combatIdSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.advanceTurn(parsed.data.combatId)
      io.to(roomKey).emit(S2C.COMBAT_STATE_UPDATE, result.snapshot)
      if (result.newRound) {
        io.to(roomKey).emit(S2C.COMBAT_ROUND_END, { combatId: parsed.data.combatId, roundNumber: result.snapshot.roundNumber - 1 })
      }
      if (result.snapshot.activePlayerId) {
        io.to(roomKey).emit(S2C.COMBAT_TURN_START, {
          combatId: parsed.data.combatId,
          playerId: result.snapshot.activePlayerId,
          roundNumber: result.snapshot.roundNumber,
        })
      }
      emitEvents(io, roomKey, parsed.data.combatId, result.events)
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '操作失败')
    }
  })

  // GM ends a specific combat
  socket.on(C2S.COMBAT_GM_END, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = combatIdSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    try {
      const result = combatService.stopCombat(parsed.data.combatId)
      if (result) {
        io.to(roomKey).emit(S2C.COMBAT_ENDED, { ...result.snapshot })
        emitEvents(io, roomKey, parsed.data.combatId, result.events)
        logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'combat', description: `战斗结束 (${parsed.data.combatId.slice(0, 8)})` })
      }
    } catch (err) {
      emitError(socket, err instanceof Error ? err.message : '操作失败')
    }
  })
}

function emitEvents(io: Server, roomKey: string, combatId: string, events: Array<{ type: string; playerId: string; description: string; data?: Record<string, unknown> }>) {
  for (const event of events) {
    io.to(roomKey).emit(S2C.COMBAT_LOG_ENTRY, { combatId, ...event })
  }
}
