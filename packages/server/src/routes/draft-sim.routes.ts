/**
 * 轮抓模拟器 REST API
 *
 * 纯 HTTP，不需要 Socket.IO，不需要房间。
 * 前端直接 fetch 调用。
 */

import { Router } from 'express'
import { accountAuthMiddleware } from '../middleware/auth.js'
import * as draftSim from '../services/draft-sim.service.js'

const router: Router = Router()

// 创建模拟会话
router.post('/create', accountAuthMiddleware, (req, res, next) => {
  try {
    const auth = (req as any).auth
    const result = draftSim.createSession(auth.displayName || auth.username || '玩家')
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

// 选技能（人类选 → AI自动跟选 → 返回新包）
router.post('/:sessionId/pick', accountAuthMiddleware, (req, res, next) => {
  try {
    const { skillId } = req.body
    if (!skillId) { res.status(400).json({ success: false, error: '缺少 skillId' }); return }
    const result = draftSim.pick(req.params.sessionId!, skillId)
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

// 获取当前状态和所有人选取结果
router.get('/:sessionId/results', accountAuthMiddleware, (req, res, next) => {
  try {
    const result = draftSim.getResults(req.params.sessionId!)
    if (!result) { res.status(404).json({ success: false, error: '会话不存在' }); return }
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

// 定稿：保留7弃3
router.post('/:sessionId/finalize', accountAuthMiddleware, (req, res, next) => {
  try {
    const { keepIds } = req.body
    const result = draftSim.finalize(req.params.sessionId!, keepIds || [])
    if (!result) { res.status(404).json({ success: false, error: '会话不存在' }); return }
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

// 获取会话信息
router.get('/:sessionId', accountAuthMiddleware, (req, res) => {
  const session = draftSim.getSession(req.params.sessionId!)
  if (!session) { res.status(404).json({ success: false, error: '会话不存在' }); return }
  res.json({ success: true, data: session })
})

// 删除会话
router.delete('/:sessionId', accountAuthMiddleware, (req, res) => {
  draftSim.deleteSession(req.params.sessionId!)
  res.json({ success: true })
})

export default router
