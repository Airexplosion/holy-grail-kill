/**
 * GameStage 流转和组队 Socket 处理
 */

import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C } from 'shared'
import type { GameStage } from 'shared'
import { z } from 'zod'
import * as stageFlow from '../services/stage-flow.service.js'
import * as gameService from '../services/game.service.js'
import * as groupService from '../services/group.service.js'
import * as playerService from '../services/player.service.js'
import * as logService from '../services/log.service.js'
import { PLAYER_COLORS } from 'shared'

const setStageSchema = z.object({ stage: z.enum(['lobby', 'character_create', 'draft', 'deck_build', 'playing', 'finished']) })
const formRequestSchema = z.object({ targetPlayerId: z.string(), role: z.enum(['master', 'servant']) })
const formAcceptSchema = z.object({ requesterId: z.string() })

// 待处理的组队请求 roomId → [{ from, to, fromRole }]
const pendingRequests = new Map<string, Array<{ fromId: string; toId: string; fromRole: 'master' | 'servant' }>>()

export function registerStageHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth

  // ── 房主/GM 强制设置阶段 ──
  socket.on(C2S.GAME_SET_STAGE, (data: unknown) => {
    const parsed = setStageSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    stageFlow.forceSetStage(auth.roomId, parsed.data.stage)
    io.to(roomKey).emit(S2C.GAME_STAGE_CHANGED, { stage: parsed.data.stage })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'stage', description: `阶段设置为 ${parsed.data.stage}` })
  })

  // ── GAME_START: 房主点"开始游戏"，从 lobby → character_create ──
  socket.on(C2S.GAME_START, () => {
    const currentStage = gameService.getGameStage(auth.roomId)

    if (currentStage === 'lobby') {
      // 检查是否有足够的组
      if (!stageFlow.checkAllGroupsFormed(auth.roomId)) {
        emitError(socket, '至少需要2个组才能开始')
        return
      }

      stageFlow.forceSetStage(auth.roomId, 'character_create')
      io.to(roomKey).emit(S2C.GAME_STAGE_CHANGED, { stage: 'character_create' })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'stage', description: '游戏开始 → 角色创建阶段' })
    }
  })

  // ── 组队请求 ──
  socket.on(C2S.GROUP_FORM_REQUEST, (data: unknown) => {
    const parsed = formRequestSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    // 检查目标玩家存在且在同一房间
    const target = playerService.getPlayer(parsed.data.targetPlayerId)
    if (!target || target.roomId !== auth.roomId) { emitError(socket, '目标玩家不在房间'); return }

    // 检查双方都没有组
    const myGroup = groupService.getPlayerGroup(auth.playerId)
    const theirGroup = groupService.getPlayerGroup(parsed.data.targetPlayerId)
    if (myGroup) { emitError(socket, '你已经在一个组中'); return }
    if (theirGroup) { emitError(socket, '对方已经在一个组中'); return }

    // 存储请求
    const roomRequests = pendingRequests.get(auth.roomId) || []
    // 移除旧请求
    const filtered = roomRequests.filter(r => r.fromId !== auth.playerId)
    filtered.push({ fromId: auth.playerId, toId: parsed.data.targetPlayerId, fromRole: parsed.data.role })
    pendingRequests.set(auth.roomId, filtered)

    // 通知目标玩家
    io.to(roomKey).emit('group:form:requested', {
      fromId: auth.playerId,
      fromName: playerService.getPlayer(auth.playerId)?.displayName,
      toId: parsed.data.targetPlayerId,
      fromRole: parsed.data.role,
    })
  })

  // ── 接受组队 ──
  socket.on(C2S.GROUP_FORM_ACCEPT, (data: unknown) => {
    const parsed = formAcceptSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const roomRequests = pendingRequests.get(auth.roomId) || []
    const request = roomRequests.find(r => r.fromId === parsed.data.requesterId && r.toId === auth.playerId)
    if (!request) { emitError(socket, '没有找到组队请求'); return }

    // 确定 Master 和 Servant
    const masterId = request.fromRole === 'master' ? request.fromId : auth.playerId
    const servantId = request.fromRole === 'servant' ? request.fromId : auth.playerId

    // 分配颜色
    const existingGroups = groupService.getRoomGroups(auth.roomId)
    const color = PLAYER_COLORS[existingGroups.length % PLAYER_COLORS.length] || '#3B82F6'
    const groupName = `组${existingGroups.length + 1}`

    // 创建组
    const group = groupService.createGroup(auth.roomId, masterId, servantId, groupName, color)

    // 清除该请求
    pendingRequests.set(auth.roomId, roomRequests.filter(r => r !== request))

    // 广播
    io.to(roomKey).emit(S2C.GROUP_STATE, { group })
    io.to(roomKey).emit(S2C.GROUP_LIST, { groups: groupService.getRoomGroups(auth.roomId) })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'group', description: `${groupName} 组建完成` })
  })
}

/**
 * 阶段自动推进辅助函数（供其他 handler 调用）
 */
export function tryAutoAdvance(roomId: string, roomKey: string, io: Server): void {
  const newStage = stageFlow.tryAdvanceStage(roomId)
  if (newStage) {
    io.to(roomKey).emit(S2C.GAME_STAGE_CHANGED, { stage: newStage })
  }
}
