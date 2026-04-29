import { useEffect, useState, useCallback } from 'react'
import { api, CommitInfo } from '../api'

export default function History() {
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getHistory()
      setCommits(data.commits)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRestore(hash: string) {
    if (!confirm(`Restore version ${hash.slice(0, 7)}? Companion will be restarted.`)) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await api.restoreCommit(hash)
      setMsg(`Restored to ${hash.slice(0, 7)}`)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2>History</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {msg && <p style={{ color: 'green' }}>{msg}</p>}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={th}>Time</th>
            <th style={th}>Hash</th>
            <th style={th}>Message</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {commits.map(c => (
            <tr key={c.oid}>
              <td style={td}>{new Date(c.timestamp).toLocaleString()}</td>
              <td style={td}><code>{c.oid.slice(0, 7)}</code></td>
              <td style={td}>{c.message.trim()}</td>
              <td style={td}>
                <button
                  onClick={() => handleRestore(c.oid)}
                  disabled={busy}
                  style={btnSm}
                >
                  Restore
                </button>
              </td>
            </tr>
          ))}
          {commits.length === 0 && (
            <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#888' }}>No commits yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 12px', borderBottom: '2px solid #ddd', textAlign: 'left' }
const td: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #eee' }
const btnSm: React.CSSProperties = { padding: '4px 10px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }
