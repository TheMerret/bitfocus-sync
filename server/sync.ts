import fs from 'fs'
import path from 'path'
import { loadConfig } from './config.js'
import { hasChanges, commitChanges, pushChanges } from './git.js'
import { dumpDatabasesFromDir } from './sqlite.js'

export type SyncStatus = 'idle' | 'syncing' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncTime: string | null
  lastCommitHash: string | null
  lastError: string | null
  autoSync: boolean
}

export const state: SyncState = {
  status: 'idle',
  lastSyncTime: null,
  lastCommitHash: null,
  lastError: null,
  autoSync: true,
}

let syncTimer: ReturnType<typeof setInterval> | null = null

export async function runSync(): Promise<void> {
  if (state.status === 'syncing') return
  state.status = 'syncing'
  state.lastError = null

  try {
    const config = loadConfig()

    // dump SQLite databases
    dumpDatabasesFromDir(config.companionConfigDir, config.gitRepoDir)

    // copy config directory contents
    await copyConfigFiles(config.companionConfigDir, config.gitRepoDir)

    // check if anything changed
    if (!(await hasChanges({ gitRepoDir: config.gitRepoDir, remote: config.remote }))) {
      state.status = 'idle'
      return
    }

    const now = new Date()
    const message = `sync: ${now.toISOString().replace('T', ' ').slice(0, 19)}`
    const oid = await commitChanges({ gitRepoDir: config.gitRepoDir, remote: config.remote }, message)
    await pushChanges({ gitRepoDir: config.gitRepoDir, remote: config.remote })

    state.lastSyncTime = now.toISOString()
    state.lastCommitHash = oid
    state.status = 'idle'
  } catch (err) {
    state.status = 'error'
    state.lastError = err instanceof Error ? err.message : String(err)
    console.error('Sync failed:', state.lastError)
  }
}

async function copyConfigFiles(srcDir: string, destDir: string): Promise<void> {
  if (!fs.existsSync(srcDir)) return
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.endsWith('.sqlite-shm') || entry.name.endsWith('.sqlite-wal')) continue
    const src = path.join(srcDir, entry.name)
    const dest = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true })
      await copyConfigFiles(src, dest)
    } else {
      fs.copyFileSync(src, dest)
    }
  }
}

export function startSyncScheduler(): void {
  const config = loadConfig()
  const interval = config.syncIntervalMs ?? 300000
  syncTimer = setInterval(() => {
    if (state.autoSync) runSync()
  }, interval)
  console.log(`Sync scheduler started — interval ${interval}ms`)
}

export function stopSyncScheduler(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}
