import express, { Request, Response } from 'express'
import cors from 'cors'
import { startSyncScheduler } from './sync.js'
import { apiRouter } from './api.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

app.use('/api', apiRouter)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Companion Sync backend listening on http://127.0.0.1:${PORT}`)
  startSyncScheduler()
})
