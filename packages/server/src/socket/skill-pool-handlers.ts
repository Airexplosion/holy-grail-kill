/**
 * 地图池 Socket 事件处理器
 */

import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C } from 'shared'
import * as skillPoolService from '../services/skill-pool.service.js'
import * as logService from '../services/log.service.js'
import { z } from 'zod'

const replaceSchema = z.object({
  newSkillPoolEntryId: z.string().uuid(),
  oldPlayerSkillId: z.string().uuid(),
})

export function registerSkillPoolHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth

  // 获取地图池快照（全员可见）
  socket.on(C2S.POOL_GET_SNAPSHOT, () => {
    const snapshot = skillPoolService.getSnapshot(auth.roomId)
    socket.emit(S2C.POOL_SNAPSHOT, { skills: snapshot })
  })

  // 战后抽取（由战斗结束事件触发，或玩家主动请求）
  socket.on(C2S.POOL_DRAW, () => {
    if (auth.isGm) { emitError(socket, 'GM不能抽取'); return }

    const result = skillPoolService.drawFromPool(auth.roomId, auth.playerId)
    socket.emit(S2C.POOL_DRAW_RESULT, result)

    logService.recordLog({
      roomId: auth.roomId,
      playerId: auth.playerId,
      actionType: 'pool',
      description: `从地图池抽取了 ${result.drawnSkills.length} 个技能`,
    })
  })

  // 替换技能
  socket.on(C2S.POOL_REPLACE_SKILL, (data: unknown) => {
    const parsed = replaceSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = skillPoolService.replaceSkill(
      auth.roomId,
      auth.playerId,
      parsed.data.newSkillPoolEntryId,
      parsed.data.oldPlayerSkillId,
    )

    socket.emit(S2C.POOL_REPLACE_RESULT, result)

    if (result.success) {
      logService.recordLog({
        roomId: auth.roomId,
        playerId: auth.playerId,
        actionType: 'pool',
        description: `替换技能成功 (剩余${result.replacementsRemaining}次)`,
        details: { newSkillId: result.newSkillId, oldSkillId: result.oldSkillId },
      })
    }
  })

  // 放弃本次抽取
  socket.on(C2S.POOL_SKIP, () => {
    const result = skillPoolService.skipDraw(auth.roomId, auth.playerId)
    socket.emit(S2C.POOL_REPLACE_RESULT, { success: true, ...result, newSkillId: '', oldSkillId: '', error: undefined })
  })
}
