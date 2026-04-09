import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C } from 'shared'
import * as gameService from '../services/game.service.js'
import * as groupService from '../services/group.service.js'
import * as playerService from '../services/player.service.js'
import * as logService from '../services/log.service.js'

/**
 * 注册组相关的 Socket 事件处理
 * - GROUP_READY / GROUP_UNREADY: 标记/取消就绪
 * - 自动推进阶段（所有存活组 ready 时）
 */
export function registerGroupHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth

  socket.on(C2S.GROUP_READY, () => {
    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) {
      emitError(socket, '你不属于任何组')
      return
    }

    const result = gameService.markGroupReady(auth.roomId, group.id)

    // 广播就绪状态更新
    io.to(roomKey).emit(S2C.GROUP_READY_UPDATE, {
      groupId: group.id,
      ready: true,
      ...gameService.getReadyStatus(auth.roomId),
    })

    if (result.autoAdvanced && result.result) {
      // 自动推进阶段
      io.to(roomKey).emit(S2C.PHASE_AUTO_ADVANCED, result.result)
      io.to(roomKey).emit(S2C.GAME_PHASE_CHANGED, result.result)

      // 如果进入行动阶段，广播 AP 更新
      if (result.result.phase === 'action') {
        broadcastAPUpdate(io, roomKey, auth.roomId)
      }

      logService.recordLog({
        roomId: auth.roomId,
        playerId: auth.playerId,
        actionType: 'phase',
        description: `所有组已就绪，自动推进至 ${result.result.phase}`,
      })
    }
  })

  socket.on(C2S.GROUP_UNREADY, () => {
    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) {
      emitError(socket, '你不属于任何组')
      return
    }

    gameService.unmarkGroupReady(auth.roomId, group.id)

    io.to(roomKey).emit(S2C.GROUP_READY_UPDATE, {
      groupId: group.id,
      ready: false,
      ...gameService.getReadyStatus(auth.roomId),
    })
  })
}

function broadcastAPUpdate(io: Server, roomKey: string, roomId: string) {
  const allPlayers = playerService.getNonGmPlayers(roomId)
  for (const p of allPlayers) {
    const updated = playerService.getPlayer(p.id)
    if (updated) {
      io.to(roomKey).emit(S2C.ACTION_AP_UPDATE, {
        playerId: p.id,
        remainingAP: updated.actionPoints,
      })
    }
  }
}
