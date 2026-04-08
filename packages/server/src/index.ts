import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { env } from './config/env.js'
import { getDb, closeDb } from './db/connection.js'
import { errorHandler } from './middleware/error-handler.js'
import { setupSocketIO } from './socket/index.js'
import authRoutes from './routes/auth.routes.js'
import roomRoutes from './routes/room.routes.js'
import healthRoutes from './routes/health.routes.js'

const app = express()
const httpServer = createServer(app)

// Middleware
app.use(cors({ origin: env.clientUrl }))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/health', healthRoutes)

// Error handler
app.use(errorHandler)

// Initialize DB
getDb()
console.log('[DB] Database initialized')

// Setup Socket.IO
setupSocketIO(httpServer)
console.log('[Socket] Socket.IO initialized')

// Start server
httpServer.listen(env.port, () => {
  console.log(`[Server] 圣杯杀服务器运行在 http://localhost:${env.port}`)
  console.log(`[Server] 环境: ${env.nodeEnv}`)
})

// Graceful shutdown
function shutdown() {
  console.log('[Server] Shutting down...')
  closeDb()
  httpServer.close(() => {
    console.log('[Server] Server closed')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
