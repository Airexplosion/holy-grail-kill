import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C } from 'shared'
import { z } from 'zod'
import * as draftService from '../services/draft.service.js'
import * as groupService from '../services/group.service.js'
import * as logService from '../services/log.service.js'

const draftPickSchema = z.object({ skillId: z.string() })
const draftFinalizeSchema = z.object({ keepIds: z.array(z.string()) })

export function registerDraftHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth

  // 选取技能
  socket.on(C2S.DRAFT_PICK, (data: unknown) => {
    const parsed = draftPickSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const result = draftService.draftPick(auth.roomId, group.id, parsed.data.skillId)
    if (!result.success) { emitError(socket, result.error!); return }

    // 通知选取者
    socket.emit(S2C.DRAFT_PICK_MADE, {
      groupId: group.id,
      skill: result.skill,
      round: draftService.getDraftState(auth.roomId)?.round,
    })

    // 广播状态更新
    io.to(roomKey).emit(S2C.DRAFT_STATE_UPDATE, draftService.getDraftState(auth.roomId))

    // 如果轮次完成，给所有组发新包
    if (result.roundComplete) {
      broadcastPacks(io, roomKey, auth.roomId)
    }

    // 如果轮抓全部完成
    if (result.draftComplete) {
      io.to(roomKey).emit(S2C.DRAFT_STATE_UPDATE, draftService.getDraftState(auth.roomId))
    }

    logService.recordLog({
      roomId: auth.roomId,
      playerId: auth.playerId,
      actionType: 'draft',
      description: `选取技能: ${result.skill?.name}`,
    })
  })

  // 最终确认（保留7弃3）
  socket.on(C2S.DRAFT_FINALIZE, (data: unknown) => {
    const parsed = draftFinalizeSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const result = draftService.finalizeDraft(auth.roomId, group.id, parsed.data.keepIds)
    if (!result.success) { emitError(socket, result.error!); return }

    socket.emit(S2C.DRAFT_COMPLETE, {
      groupId: group.id,
      kept: result.kept,
    })

    // 检查是否所有组都完成了
    if (draftService.isAllFinalized(auth.roomId)) {
      draftService.completeDraft(auth.roomId)
      io.to(roomKey).emit(S2C.DRAFT_STATE_UPDATE, draftService.getDraftState(auth.roomId))
      logService.recordLog({
        roomId: auth.roomId,
        playerId: auth.playerId,
        actionType: 'draft',
        description: '所有组轮抓完成',
      })
    }
  })
}

/** 广播每个组的新技能包 */
function broadcastPacks(io: Server, roomKey: string, roomId: string) {
  const roomSockets = io.sockets.adapter.rooms.get(roomKey)
  if (!roomSockets) return

  for (const socketId of roomSockets) {
    const sock = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined
    if (!sock) continue

    const group = groupService.getPlayerGroup(sock.data.auth.playerId)
    if (!group) continue

    const pack = draftService.getGroupCurrentPack(roomId, group.id)
    sock.emit(S2C.DRAFT_PACK_RECEIVED, { skills: pack })
  }
}
