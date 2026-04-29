import { useEffect, useState, useCallback } from 'react'
import { api, SyncStatus } from '../api'

export default function Dashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setStatus(await api.getStatus())
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  async function handleSync() {
    setBusy(true)
    try {
      await api.triggerSync()
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleAuto() {
    if (!status) return
    try {
      const result = await api.toggleAutoSync(!status.autoSync)
      setStatus(s => s ? { ...s, autoSync: result.autoSync } : s)
    } catch (e) {
      setError(String(e))
    }
  }

  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>
  if (!status) return <p>Loading…</p>

  const statusColor = status.status === 'error' ? 'red' : status.status === 'syncing' ? 'orange' : 'green'

  return (
    <div>
      <h2>Dashboard</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <tr><td style={td}>Branch</td><td style={td}><code>{status.currentBranch}</code></td></tr>
          <tr>
            <td style={td}>Status</td>
            <td style={td}><span style={{ color: statusColor }}>{status.status}</span></td>
          </tr>
          <tr><td style={td}>Last sync</td><td style={td}>{status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString() : '—'}</td></tr>
          <tr><td style={td}>Last commit</td><td style={td}>{status.lastCommitHash ? <code>{status.lastCommitHash.slice(0, 7)}</code> : '—'}</td></tr>
          {status.lastError && <tr><td style={td}>Last error</td><td style={{ ...td, color: 'red' }}>{status.lastError}</td></tr>}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button onClick={handleSync} disabled={busy || status.status === 'syncing'} style={btn}>
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <button onClick={handleToggleAuto} style={{ ...btn, background: status.autoSync ? '#888' : '#0066cc' }}>
          Auto-sync: {status.autoSync ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  )
}

const td: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #eee', verticalAlign: 'top' }
const btn: React.CSSProperties = { padding: '8px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
