import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { accountAuthMiddleware, signAccountToken, signToken } from '../middleware/auth.js'
import { registerSchema, accountLoginSchema, joinRoomSchema } from 'shared'
import * as accountService from '../services/account.service.js'
import * as authService from '../services/auth.service.js'

const router = Router()

// Register new account
router.post('/register', validate(registerSchema), (req, res, next) => {
  try {
    const account = accountService.register(req.body.username, req.body.password, req.body.displayName)
    const token = signAccountToken({
      accountId: account.id,
      username: account.username,
      displayName: account.displayName,
    })
    res.json({ success: true, data: { account, token } })
  } catch (err) {
    next(err)
  }
})

// Login with account
router.post('/login', validate(accountLoginSchema), (req, res, next) => {
  try {
    const account = accountService.login(req.body.username, req.body.password)
    const token = signAccountToken({
      accountId: account.id,
      username: account.username,
      displayName: account.displayName,
      isAdmin: account.isAdmin,
    })
    res.json({ success: true, data: { account, token } })
  } catch (err) {
    next(err)
  }
})

// Join a room (requires account token)
router.post('/join-room', accountAuthMiddleware, validate(joinRoomSchema), async (req, res, next) => {
  try {
    const auth = (req as any).auth
    const accountId = auth.accountId || auth.playerId
    const username = auth.username || auth.accountName

    const result = await authService.login({
      accountName: username,
      roomCode: req.body.roomCode,
      displayName: req.body.displayName || auth.displayName || username,
    })

    // Issue game token
    const gameToken = signToken({
      playerId: result.player.id,
      roomId: result.room.id,
      isGm: result.player.isGm,
      accountName: username,
      accountId,
    })

    res.json({ success: true, data: { ...result, token: gameToken } })
  } catch (err) {
    next(err)
  }
})

// Reconnect with game token
router.post('/reconnect', (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: '未提供认证令牌' })
      return
    }
    const result = authService.reconnect(authHeader.slice(7))
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// Validate account token (check if still logged in)
router.get('/me', accountAuthMiddleware, (req, res) => {
  const auth = (req as any).auth
  res.json({
    success: true,
    data: {
      accountId: auth.accountId,
      username: auth.username,
      displayName: auth.displayName,
      isAdmin: auth.isAdmin || false,
    },
  })
})

export default router
