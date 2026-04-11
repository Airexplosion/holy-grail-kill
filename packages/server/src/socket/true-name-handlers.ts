/**
 * 真名系统 Socket 事件处理器
 *
 * 设计原则（用户要求）：
 * - 遭遇记录全自动（移动/行动结算时触发，无需手动操作）
 * - 猜测入口只在遭遇过对手后出现
 * - UI 尽量精简，3选1弹窗即可
 */

import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C } from 'shared'
import * as trueNameService from '../services/true-name.service.js'
import { z } from 'zod'

const guessSchema = z.object({
  targetPlayerId: z.string().uuid(),
  guessedName: z.string().min(1),
})

export function registerTrueNameHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  emitError: (socket: AuthenticatedSocket, msg: string) => void,
) {
  const auth = socket.data.auth
  if (auth.isGm) return // GM 不参与真名系统

  // 获取可猜测目标列表（前端打开真名面板时调用）
  socket.on(C2S.TRUE_NAME_GET_CANDIDATES, () => {
    const candidates = trueNameService.getCandidates(auth.playerId, auth.roomId)
    socket.emit(S2C.TRUE_NAME_CANDIDATES, { candidates })
  })

  // 执行猜测
  socket.on(C2S.TRUE_NAME_GUESS, (data: unknown) => {
    const parsed = guessSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = trueNameService.guess(auth.playerId, parsed.data.targetPlayerId, parsed.data.guessedName)
    socket.emit(S2C.TRUE_NAME_RESULT, result)

    // 猜中后发送更新的已揭示列表
    if (result.correct) {
      const revealed = trueNameService.getRevealedAttributes(auth.playerId)
      const list = [...revealed.entries()].map(([targetId, attrs]) => ({ targetPlayerId: targetId, attributes: attrs }))
      socket.emit(S2C.TRUE_NAME_REVEALED_LIST, { revealed: list })
    }
  })
}
