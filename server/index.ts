import express, { Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { startSyncScheduler } from './sync'
import { apiRouter } from './api'

const app = express()
const PORT = 3001 // backend port

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

// API routes
app.use('/api', apiRouter)

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Companion Sync backend listening on http://127.0.0.1:${PORT}`)
  // start periodic sync after server is ready
  startSyncScheduler()
})
