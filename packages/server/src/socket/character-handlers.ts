import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C } from 'shared'
import {
  allocateServantAttributesSchema, allocateMasterAttributesSchema,
  selectClassSchema, selectArchetypeSchema, selectTacticalStyleSchema,
} from 'shared'
import type { ServantAttributes, MasterAttributes, ServantClassId, MasterArchetypeId } from 'shared'
import * as characterService from '../services/character.service.js'
import * as groupService from '../services/group.service.js'
import * as logService from '../services/log.service.js'
import { tryAutoAdvance } from './stage-handlers.js'

export function registerCharacterHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth

  // 幻身属性分配
  socket.on(C2S.CHARACTER_ALLOCATE_ATTRIBUTES, (data: unknown) => {
    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    // 判断是幻身还是篡者
    const isServant = group.servantPlayerId === auth.playerId
    const isMaster = group.masterPlayerId === auth.playerId

    if (isServant) {
      const parsed = allocateServantAttributesSchema.safeParse(data)
      if (!parsed.success) { emitError(socket, '参数验证失败'); return }

      const result = characterService.allocateServantAttributes(
        auth.playerId,
        parsed.data as ServantAttributes,
      )
      if (!result.success) { emitError(socket, result.error!); return }

      socket.emit(S2C.CHARACTER_STATE, { playerId: auth.playerId, type: 'attributes_set' })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'character', description: '幻身属性分配完成' })
    } else if (isMaster) {
      const parsed = allocateMasterAttributesSchema.safeParse(data)
      if (!parsed.success) { emitError(socket, '参数验证失败'); return }

      const result = characterService.allocateMasterAttributes(
        auth.playerId,
        parsed.data as MasterAttributes,
      )
      if (!result.success) { emitError(socket, result.error!); return }

      socket.emit(S2C.CHARACTER_STATE, { playerId: auth.playerId, type: 'attributes_set' })
      logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'character', description: '篡者属性分配完成' })
    } else {
      emitError(socket, '无法确定角色类型')
    }
  })

  // 职业选择（仅幻身）
  socket.on(C2S.CHARACTER_SELECT_CLASS, (data: unknown) => {
    const parsed = selectClassSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = characterService.selectClass(auth.playerId, parsed.data.classId as ServantClassId)
    if (!result.success) { emitError(socket, result.error!); return }

    socket.emit(S2C.CHARACTER_STATE, { playerId: auth.playerId, type: 'class_selected', classId: parsed.data.classId })
    io.to(roomKey).emit(S2C.CHARACTER_CONFIRMED, { playerId: auth.playerId, field: 'class' })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'character', description: `选择职业: ${parsed.data.classId}` })
  })

  // 范型选择（仅篡者）
  socket.on(C2S.CHARACTER_SELECT_ARCHETYPE, (data: unknown) => {
    const parsed = selectArchetypeSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = characterService.selectArchetype(auth.playerId, parsed.data.archetypeId as MasterArchetypeId)
    if (!result.success) { emitError(socket, result.error!); return }

    socket.emit(S2C.CHARACTER_STATE, { playerId: auth.playerId, type: 'archetype_selected', archetypeId: parsed.data.archetypeId })
    io.to(roomKey).emit(S2C.CHARACTER_CONFIRMED, { playerId: auth.playerId, field: 'archetype' })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'character', description: `选择范型: ${parsed.data.archetypeId}` })
  })

  // 战术风格选择（仅篡者）
  socket.on(C2S.CHARACTER_SELECT_TACTICAL_STYLE, (data: unknown) => {
    const parsed = selectTacticalStyleSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = characterService.selectTacticalStyle(auth.playerId, parsed.data.color)
    if (!result.success) { emitError(socket, result.error!); return }

    socket.emit(S2C.CHARACTER_STATE, { playerId: auth.playerId, type: 'tactical_style_selected', color: parsed.data.color })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'character', description: `选择战术风格: ${parsed.data.color}` })
  })

  // 确认角色创建完成
  socket.on(C2S.CHARACTER_CONFIRM, () => {
    const group = groupService.getPlayerGroup(auth.playerId)
    if (!group) { emitError(socket, '你不属于任何组'); return }

    const isServant = group.servantPlayerId === auth.playerId
    const check = isServant
      ? characterService.checkServantComplete(auth.playerId)
      : characterService.checkMasterComplete(auth.playerId)

    if (!check.complete) {
      emitError(socket, `角色创建未完成: ${check.missing.join(', ')}`)
      return
    }

    socket.emit(S2C.CHARACTER_CONFIRMED, { playerId: auth.playerId, field: 'all' })
    io.to(roomKey).emit(S2C.CHARACTER_CONFIRMED, { playerId: auth.playerId, field: 'complete' })
    logService.recordLog({ roomId: auth.roomId, playerId: auth.playerId, actionType: 'character', description: '角色创建确认完成' })

    // 检查是否所有组都确认了 → 自动推进到 draft
    tryAutoAdvance(auth.roomId, roomKey, io)
  })
}
