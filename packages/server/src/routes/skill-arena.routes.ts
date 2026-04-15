import { Router } from 'express'
import { accountAuthMiddleware } from '../middleware/auth.js'
import * as arenaEngine from '../engine/skill-arena-engine.js'
import * as adminLibrary from '../services/admin-library.service.js'

const router: Router = Router()
router.use(accountAuthMiddleware)

// 获取可用技能列表
router.get('/skills', (_req, res) => {
  const skills = adminLibrary.getAllSkills()
  res.json({ success: true, data: skills })
})

// 创建会话
router.post('/sessions', (req, res, next) => {
  try {
    const auth = (req as any).auth
    const config = req.body || {}

    // 如果传了 skillIds，从技能库加载
    let skills: any[] = []
    if (config.skillIds?.length) {
      const allSkills = adminLibrary.getAllSkills()
      skills = config.skillIds.map((id: string) => {
        const s = allSkills.find((sk: any) => sk.id === id)
        if (!s) return null
        return {
          id: s.id, name: s.name, type: s.type,
          cooldown: s.cooldown, cooldownRemaining: 0,
          description: s.description, effects: s.effects,
        }
      }).filter(Boolean)
    }

    const session = arenaEngine.createSession(auth.accountId, { ...config, skills })
    res.json({ success: true, data: arenaEngine.getSnapshot(session) })
  } catch (err) { next(err) }
})

// 获取会话
router.get('/sessions/:id', (req, res) => {
  const session = arenaEngine.getSession(req.params.id!)
  if (!session) return res.status(404).json({ success: false, error: '会话不存在' })
  res.json({ success: true, data: arenaEngine.getSnapshot(session) })
})

// 出牌
router.post('/sessions/:id/play-strike', (req, res, next) => {
  try {
    const session = arenaEngine.getSession(req.params.id!)
    if (!session) return res.status(404).json({ success: false, error: '会话不存在' })
    const result = arenaEngine.playStrike(session, req.body.color)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.json({ success: false, error: err.message })
  }
})

// 使用技能
router.post('/sessions/:id/use-skill', (req, res) => {
  try {
    const session = arenaEngine.getSession(req.params.id!)
    if (!session) return res.status(404).json({ success: false, error: '会话不存在' })
    const result = arenaEngine.useSkill(session, req.body.skillId)
    res.json({ success: true, data: result })
  } catch (err: any) { res.json({ success: false, error: err.message }) }
})

// 响应（木头人攻击你时）
router.post('/sessions/:id/respond', (req, res) => {
  try {
    const session = arenaEngine.getSession(req.params.id!)
    if (!session) return res.status(404).json({ success: false, error: '会话不存在' })
    const result = arenaEngine.playerRespond(session, req.body.color || undefined)
    res.json({ success: true, data: result })
  } catch (err: any) { res.json({ success: false, error: err.message }) }
})

// Pass（结束本轮行动）
router.post('/sessions/:id/pass', (req, res) => {
  try {
    const session = arenaEngine.getSession(req.params.id!)
    if (!session) return res.status(404).json({ success: false, error: '会话不存在' })
    const snapshot = arenaEngine.playerPass(session)
    res.json({ success: true, data: snapshot })
  } catch (err: any) { res.json({ success: false, error: err.message }) }
})

// 推进回合
router.post('/sessions/:id/advance-round', (req, res) => {
  const session = arenaEngine.getSession(req.params.id!)
  if (!session) return res.status(404).json({ success: false, error: '会话不存在' })
  const snapshot = arenaEngine.advanceRound(session)
  res.json({ success: true, data: snapshot })
})

// 获取日志
router.get('/sessions/:id/logs', (req, res) => {
  const session = arenaEngine.getSession(req.params.id!)
  if (!session) return res.status(404).json({ success: false, error: '会话不存在' })
  res.json({ success: true, data: session.logs })
})

// 删除会话
router.delete('/sessions/:id', (req, res) => {
  arenaEngine.deleteSession(req.params.id!)
  res.json({ success: true })
})

export default router
