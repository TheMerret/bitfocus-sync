import { Router, Request, Response } from 'express'
import fs from 'fs'
import { loadConfig, saveConfig, AppConfig } from './config.js'
import { runSync, state } from './sync.js'
import { listBranches, createBranch, switchBranch, getCommitHistory, checkoutCommit } from './git.js'
import { stopCompanion, startCompanion, waitForCompanion } from './companion.js'

export const apiRouter = Router()

// --- Status ---
apiRouter.get('/status', (_req: Request, res: Response) => {
  const config = loadConfig()
  res.json({
    ...state,
    currentBranch: getCurrentBranch(config.gitRepoDir),
  })
})

// --- Sync ---
apiRouter.post('/sync', async (_req: Request, res: Response) => {
  runSync().catch(() => {})
  res.json({ ok: true })
})

apiRouter.post('/sync/toggle', (req: Request, res: Response) => {
  const { enabled } = req.body as { enabled: boolean }
  state.autoSync = enabled
  res.json({ autoSync: state.autoSync })
})

// --- Profiles (branches) ---
apiRouter.get('/profiles', async (_req: Request, res: Response) => {
  try {
    const config = loadConfig()
    const branches = await listBranches({ gitRepoDir: config.gitRepoDir, remote: config.remote })
    const current = getCurrentBranch(config.gitRepoDir)
    res.json({ branches, current })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

apiRouter.post('/profiles', async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string }
    const config = loadConfig()
    await createBranch({ gitRepoDir: config.gitRepoDir, remote: config.remote }, name)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

apiRouter.post('/profiles/switch', async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string }
    const config = loadConfig()
    await stopCompanion(config)
    await switchBranch({ gitRepoDir: config.gitRepoDir, remote: config.remote }, name)
    await startCompanion(config)
    await waitForCompanion(config)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// --- History ---
apiRouter.get('/history', async (_req: Request, res: Response) => {
  try {
    const config = loadConfig()
    const branch = getCurrentBranch(config.gitRepoDir)
    const commits = await getCommitHistory({ gitRepoDir: config.gitRepoDir, remote: config.remote }, branch)
    res.json({ commits })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

apiRouter.post('/history/restore', async (req: Request, res: Response) => {
  try {
    const { hash } = req.body as { hash: string }
    const config = loadConfig()
    await stopCompanion(config)
    await checkoutCommit({ gitRepoDir: config.gitRepoDir, remote: config.remote }, hash)
    await startCompanion(config)
    await waitForCompanion(config)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// --- Settings ---
apiRouter.get('/settings', (_req: Request, res: Response) => {
  try {
    const config = loadConfig()
    // never expose token in full — send masked version
    res.json({
      ...config,
      remote: {
        ...config.remote,
        token: config.remote.token ? '***' : '',
      },
    })
  } catch {
    res.json({})
  }
})

apiRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const incoming = req.body as Partial<AppConfig>
    let config: AppConfig
    try {
      config = loadConfig()
    } catch {
      config = incoming as AppConfig
    }
    // merge, preserving existing token if masked placeholder sent
    const merged: AppConfig = {
      ...config,
      ...incoming,
      remote: {
        ...config.remote,
        ...(incoming.remote ?? {}),
        token:
          incoming.remote?.token && incoming.remote.token !== '***'
            ? incoming.remote.token
            : config.remote?.token ?? '',
      },
    }
    saveConfig(merged)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

apiRouter.post('/settings/test-remote', async (_req: Request, res: Response) => {
  try {
    const config = loadConfig()
    const response = await fetch(config.remote.url, { signal: AbortSignal.timeout(5000) })
    res.json({ ok: response.status < 500 })
  } catch (err) {
    res.json({ ok: false, error: String(err) })
  }
})

apiRouter.post('/settings/test-companion', (_req: Request, res: Response) => {
  try {
    const config = loadConfig()
    const exists = fs.existsSync(config.companionExe)
    res.json({ ok: exists })
  } catch (err) {
    res.json({ ok: false, error: String(err) })
  }
})

function getCurrentBranch(repoDir: string): string {
  try {
    const headPath = `${repoDir}/.git/HEAD`
    const head = fs.readFileSync(headPath, 'utf8').trim()
    if (head.startsWith('ref: refs/heads/')) {
      return head.replace('ref: refs/heads/', '')
    }
    return head.slice(0, 7)
  } catch {
    return 'unknown'
  }
}
