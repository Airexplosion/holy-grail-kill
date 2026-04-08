import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from './middleware.js'
import { C2S, S2C, submitDeckBuildSchema, lockDeckBuildSchema, shareDeckBuildSchema, getSharedBuildSchema } from 'shared'
import * as deckBuildService from '../services/deck-build.service.js'
import * as skillLibraryService from '../services/skill-library.service.js'
import * as shareService from '../services/share.service.js'
import * as logService from '../services/log.service.js'

export function registerDeckBuildHandlers(
  socket: AuthenticatedSocket,
  roomKey: string,
  io: Server,
  requireGm: (socket: AuthenticatedSocket) => boolean,
  emitError: (socket: AuthenticatedSocket, message: string) => void,
) {
  const auth = socket.data.auth

  // Get current deck build
  socket.on(C2S.DECK_BUILD_GET, () => {
    const build = deckBuildService.getDeckBuild(auth.roomId, auth.playerId)
    socket.emit(S2C.DECK_BUILD_STATE, build)
  })

  // Submit deck build
  socket.on(C2S.DECK_BUILD_SUBMIT, (data: unknown) => {
    const parsed = submitDeckBuildSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }

    const result = deckBuildService.submitDeckBuild(
      auth.roomId, auth.playerId,
      parsed.data.strikeCards,
      parsed.data.skillIds,
    )

    if (result.valid) {
      const build = deckBuildService.getDeckBuild(auth.roomId, auth.playerId)
      socket.emit(S2C.DECK_BUILD_STATE, build)
    } else {
      socket.emit(S2C.DECK_BUILD_VALIDATION, result)
    }
  })

  // Lock deck build
  socket.on(C2S.DECK_BUILD_LOCK, () => {
    const result = deckBuildService.lockDeckBuild(auth.roomId, auth.playerId)
    if (result.valid) {
      io.to(roomKey).emit(S2C.DECK_BUILD_LOCKED, {
        playerId: auth.playerId,
        locked: true,
      })
      logService.recordLog({
        roomId: auth.roomId,
        playerId: auth.playerId,
        actionType: 'deck-build',
        description: `${auth.accountName} 锁定了配置`,
      })
    } else {
      socket.emit(S2C.DECK_BUILD_VALIDATION, result)
    }
  })

  // Unlock deck build (GM only)
  socket.on(C2S.DECK_BUILD_UNLOCK, (data: unknown) => {
    if (!requireGm(socket)) return
    const parsed = lockDeckBuildSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const targetId = parsed.data.playerId || auth.playerId
    deckBuildService.unlockDeckBuild(auth.roomId, targetId)
    io.to(roomKey).emit(S2C.DECK_BUILD_LOCKED, { playerId: targetId, locked: false })
    logService.recordLog({
      roomId: auth.roomId,
      playerId: auth.playerId,
      actionType: 'gm',
      description: `GM解锁玩家配置`,
    })
  })

  // Get skill library
  socket.on(C2S.SKILL_LIBRARY_GET, () => {
    socket.emit(S2C.SKILL_LIBRARY_DATA, { skills: skillLibraryService.getAllSkills() })
  })

  // Share deck build
  socket.on(C2S.DECK_SHARE_CREATE, (data: unknown) => {
    const parsed = shareDeckBuildSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const share = shareService.createShareLink(parsed.data.deckBuildId, auth.roomId, auth.playerId)
    socket.emit(S2C.DECK_SHARE_DATA, share)
  })

  // Get shared build
  socket.on(C2S.DECK_SHARE_GET, (data: unknown) => {
    const parsed = getSharedBuildSchema.safeParse(data)
    if (!parsed.success) { emitError(socket, '参数验证失败'); return }
    const build = shareService.getSharedBuild(parsed.data.shareCode)
    if (!build) { emitError(socket, '分享码无效'); return }
    socket.emit(S2C.DECK_SHARE_DATA, build)
  })
}
