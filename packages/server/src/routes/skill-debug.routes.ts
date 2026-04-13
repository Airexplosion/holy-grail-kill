import { Router } from 'express'
import { accountAuthMiddleware } from '../middleware/auth.js'
import * as skillLibraryService from '../services/skill-library.service.js'
import * as skillDebugService from '../services/skill-debug.service.js'

const router: Router = Router()

router.use(accountAuthMiddleware)

router.get('/skills', (_req, res) => {
  const skills = skillLibraryService.getAllSkills()
  res.json({ success: true, data: skills })
})

router.post('/run', (req, res, next) => {
  try {
    const result = skillDebugService.runSkillDebugSandbox(req.body)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
