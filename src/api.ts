const BASE = 'http://127.0.0.1:3001/api'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error'
  lastSyncTime: string | null
  lastCommitHash: string | null
  lastError: string | null
  autoSync: boolean
  currentBranch: string
}

export interface CommitInfo {
  oid: string
  message: string
  author: { name: string; email: string }
  timestamp: string
}

export interface BranchInfo {
  name: string
  lastCommit?: CommitInfo
}

export interface AppConfig {
  companionConfigDir: string
  companionExe: string
  companionPort: number
  gitRepoDir: string
  remote: { url: string; username: string; token: string }
  syncIntervalMs: number
}

export const api = {
  getStatus: () => req<SyncStatus>('GET', '/status'),
  triggerSync: () => req<{ ok: boolean }>('POST', '/sync'),
  toggleAutoSync: (enabled: boolean) => req<{ autoSync: boolean }>('POST', '/sync/toggle', { enabled }),

  getProfiles: () => req<{ branches: BranchInfo[]; current: string }>('GET', '/profiles'),
  createProfile: (name: string) => req<{ ok: boolean }>('POST', '/profiles', { name }),
  switchProfile: (name: string) => req<{ ok: boolean }>('POST', '/profiles/switch', { name }),

  getHistory: () => req<{ commits: CommitInfo[] }>('GET', '/history'),
  restoreCommit: (hash: string) => req<{ ok: boolean }>('POST', '/history/restore', { hash }),

  getSettings: () => req<AppConfig>('GET', '/settings'),
  saveSettings: (config: Partial<AppConfig>) => req<{ ok: boolean }>('POST', '/settings', config),
  testRemote: () => req<{ ok: boolean; error?: string }>('POST', '/settings/test-remote'),
  testCompanion: () => req<{ ok: boolean; error?: string }>('POST', '/settings/test-companion'),
}
