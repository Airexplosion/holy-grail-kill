import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: Date.now() } })
})

export default router
