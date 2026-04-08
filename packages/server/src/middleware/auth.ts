import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

// Account-level token (lobby, no room bound)
export interface AccountPayload {
  accountId: string
  username: string
  displayName: string
  isAdmin?: boolean
}

// Game-level token (bound to a room)
export interface AuthPayload {
  playerId: string
  roomId: string
  isGm: boolean
  accountName: string
  accountId: string
}

export function accountAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未登录' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AccountPayload | AuthPayload
    ;(req as any).auth = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload
    ;(req as any).auth = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }
}

export function signAccountToken(payload: AccountPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' })
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '24h' })
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未登录' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AccountPayload & { isAdmin?: boolean }
    if (!payload.isAdmin) {
      res.status(403).json({ success: false, error: '需要管理员权限' })
      return
    }
    ;(req as any).auth = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }
}

export function verifyToken(token: string): (AuthPayload | AccountPayload) | null {
  try {
    return jwt.verify(token, env.jwtSecret) as any
  } catch {
    return null
  }
}
