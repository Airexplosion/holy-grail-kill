/**
 * 玩家角色管理 REST API
 */

import { Router } from 'express'
import { accountAuthMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createCharacterSchema } from 'shared'
import * as charService from '../services/character-submission.service.js'

const router: Router = Router()

// 获取我的角色列表
router.get('/mine', accountAuthMiddleware, (req, res, next) => {
  try {
    const auth = (req as any).auth
    const characters = charService.getMyCharacters(auth.accountId)
    res.json({ success: true, data: characters })
  } catch (err) { next(err) }
})

// 获取我的已过审角色
router.get('/mine/approved', accountAuthMiddleware, (req, res, next) => {
  try {
    const auth = (req as any).auth
    const characters = charService.getApprovedCharacters(auth.accountId)
    res.json({ success: true, data: characters })
  } catch (err) { next(err) }
})

// 获取单个角色
router.get('/:id', accountAuthMiddleware, (req, res, next) => {
  try {
    const character = charService.getCharacterById(req.params.id!)
    if (!character) { res.status(404).json({ success: false, error: '角色不存在' }); return }
    res.json({ success: true, data: character })
  } catch (err) { next(err) }
})

// 创建角色
router.post('/', accountAuthMiddleware, validate(createCharacterSchema), (req, res, next) => {
  try {
    const auth = (req as any).auth
    const character = charService.createCharacter(auth.accountId, req.body.sourceName, req.body.skills)
    res.json({ success: true, data: character })
  } catch (err) { next(err) }
})

// 编辑角色
router.patch('/:id', accountAuthMiddleware, validate(createCharacterSchema), (req, res, next) => {
  try {
    const auth = (req as any).auth
    const character = charService.updateCharacter(req.params.id!, auth.accountId, req.body.sourceName, req.body.skills)
    res.json({ success: true, data: character })
  } catch (err) { next(err) }
})

// 提交审核
router.post('/:id/submit', accountAuthMiddleware, (req, res, next) => {
  try {
    const auth = (req as any).auth
    charService.submitForReview(req.params.id!, auth.accountId)
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
