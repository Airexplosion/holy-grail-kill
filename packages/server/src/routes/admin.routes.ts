import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { adminAuthMiddleware } from '../middleware/auth.js'
import * as adminLibrary from '../services/admin-library.service.js'
import * as accountService from '../services/account.service.js'
import * as skillSubmissionService from '../services/skill-submission.service.js'
import * as draftService from '../services/draft.service.js'
import * as skillDebugService from '../services/skill-debug.service.js'
import * as charService from '../services/character-submission.service.js'
import * as packGroupService from '../services/pack-group.service.js'
import { reviewCharacterSchema, createPackGroupSchema } from 'shared'
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

router.post('/skills/debug-test', (req, res, next) => {
  try {
    const result = skillDebugService.runSkillDebugSandbox(req.body)
    res.json({ success: true, data: result })
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

// ===== Skill Submissions =====

router.get('/skill-submissions', (_req, res) => {
  const all = skillSubmissionService.getAllPendingSubmissions()
  res.json({ success: true, data: all })
})

router.get('/skill-submissions/:roomId', (req, res) => {
  const subs = skillSubmissionService.getRoomSubmissions(req.params.roomId!)
  res.json({ success: true, data: subs })
})

router.post('/skill-submissions/:id/approve', (req, res, next) => {
  try {
    skillSubmissionService.approveSubmission(req.params.id!, req.body.adminSkillId)
    res.json({ success: true, message: '已审核通过' })
  } catch (err) { next(err) }
})

router.post('/skill-submissions/:id/reject', (req, res, next) => {
  try {
    skillSubmissionService.rejectSubmission(req.params.id!)
    res.json({ success: true, message: '已拒绝' })
  } catch (err) { next(err) }
})

// ===== Draft Pool =====

router.get('/draft-pool', (_req, res) => {
  const skills = draftService.getDraftReadySkills()
  res.json({ success: true, data: skills })
})

router.post('/draft-pool/start/:roomId', (req, res, next) => {
  try {
    const result = draftService.startDraft(req.params.roomId!)
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

// ===== 角色审核 =====

router.get('/characters', (req, res, next) => {
  try {
    const statusFilter = req.query.status as string | undefined
    const characters = charService.getAllSubmittedCharacters(statusFilter)
    res.json({ success: true, data: characters })
  } catch (err) { next(err) }
})

router.post('/characters/:id/review', (req, res, next) => {
  try {
    const parsed = reviewCharacterSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: '参数验证失败' }); return }
    charService.reviewCharacter(req.params.id!, parsed.data.status, parsed.data.reviewNotes)
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ===== 技能包组 =====

router.get('/pack-groups', (_req, res, next) => {
  try {
    const groups = packGroupService.getAllPackGroups()
    res.json({ success: true, data: groups })
  } catch (err) { next(err) }
})

router.post('/pack-groups', (req, res, next) => {
  try {
    const parsed = createPackGroupSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: '参数验证失败' }); return }
    const group = packGroupService.createPackGroup(parsed.data.name, parsed.data.characterSourceNames)
    res.json({ success: true, data: group })
  } catch (err) { next(err) }
})

router.patch('/pack-groups/:id', (req, res, next) => {
  try {
    const group = packGroupService.updatePackGroup(req.params.id!, req.body)
    if (!group) { res.status(404).json({ success: false, error: '包组不存在' }); return }
    res.json({ success: true, data: group })
  } catch (err) { next(err) }
})

router.delete('/pack-groups/:id', (req, res, next) => {
  try {
    packGroupService.deletePackGroup(req.params.id!)
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.post('/pack-groups/seed', (_req, res, next) => {
  try {
    const groups = packGroupService.seedDefaultPackGroups()
    res.json({ success: true, data: groups })
  } catch (err) { next(err) }
})

export default router
