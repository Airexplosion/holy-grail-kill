import { Router } from 'express'
import { accountAuthMiddleware } from '../middleware/auth.js'
import * as soloGameService from '../services/solo-game.service.js'

const router: Router = Router()

// 创建单机游戏
router.post('/create', accountAuthMiddleware, (req, res, next) => {
  try {
    const auth = (req as any).auth
    const result = soloGameService.createSoloGame(
      auth.accountId,
      auth.username,
      auth.displayName || auth.username,
      req.body.config,
    )
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
