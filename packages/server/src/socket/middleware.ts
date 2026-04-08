import type { Socket } from 'socket.io'
import { verifyToken, type AuthPayload } from '../middleware/auth.js'

export interface AuthenticatedSocket extends Socket {
  data: {
    auth: AuthPayload
  }
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token as string | undefined
  if (!token) {
    return next(new Error('未提供认证令牌'))
  }

  const payload = verifyToken(token)
  if (!payload) {
    return next(new Error('令牌无效或已过期'))
  }

  socket.data.auth = payload
  next()
}
