import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { adminAuthMiddleware } from '../middleware/auth.js'
import * as adminLibrary from '../services/admin-library.service.js'
import * as accountService from '../services/account.service.js'
import { getDb } from '../db/connection.js'
import { adminSkillLibrary } from '../db/schema.js'

const router: Router = Router()

// All admin routes require admin auth
router.use(adminAuthMiddleware)

// ===== Skill Library =====

router.get('/skills', (_req, res) => {
  const skills = adminLibrary.getAllSkillsAdmin()
  res.json({ success: true, data: skills })
})

router.post('/skills', (req, res, next) => {
  try {
    adminLibrary.upsertSkill(req.body)
    res.json({ success: true, message: '技能已保存' })
  } catch (err) { next(err) }
})

router.delete('/skills/:id', (req, res, next) => {
  try {
    adminLibrary.deleteSkill(req.params.id!)
    res.json({ success: true, message: '技能已删除' })
  } catch (err) { next(err) }
})

router.patch('/skills/:id/toggle', (req, res, next) => {
  try {
    adminLibrary.toggleSkill(req.params.id!, req.body.enabled)
    res.json({ success: true, message: req.body.enabled ? '技能已启用' : '技能已禁用' })
  } catch (err) { next(err) }
})

router.patch('/skills/:id/draft', (req, res, next) => {
  try {
    const db = getDb()
    db.update(adminSkillLibrary)
      .set({ draftReady: req.body.draftReady, updatedAt: Date.now() })
      .where(eq(adminSkillLibrary.id, req.params.id!))
      .run()
    res.json({ success: true, message: req.body.draftReady ? '已加入轮抓池' : '已移出轮抓池' })
  } catch (err) { next(err) }
})

router.post('/skills/seed', (_req, res, next) => {
  try {
    adminLibrary.seedSkillsFromConstants()
    res.json({ success: true, message: '已从默认库导入技能' })
  } catch (err) { next(err) }
})

// ===== Strike Card Library =====

router.get('/strike-cards', (_req, res) => {
  const cards = adminLibrary.getAllStrikeCardsAdmin()
  res.json({ success: true, data: cards })
})

router.post('/strike-cards', (req, res, next) => {
  try {
    adminLibrary.upsertStrikeCard(req.body)
    res.json({ success: true, message: '击牌已保存' })
  } catch (err) { next(err) }
})

router.delete('/strike-cards/:id', (req, res, next) => {
  try {
    adminLibrary.deleteStrikeCard(req.params.id!)
    res.json({ success: true, message: '击牌已删除' })
  } catch (err) { next(err) }
})

// ===== Account Admin =====

router.patch('/accounts/:id/admin', (req, res, next) => {
  try {
    accountService.setAdmin(req.params.id!, req.body.isAdmin)
    res.json({ success: true, message: req.body.isAdmin ? '已设为管理员' : '已取消管理员' })
  } catch (err) { next(err) }
})

export default router
