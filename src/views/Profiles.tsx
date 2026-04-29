import { useEffect, useState, useCallback } from 'react'
import { api, BranchInfo } from '../api'

export default function Profiles() {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [current, setCurrent] = useState<string>('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getProfiles()
      setBranches(data.branches)
      setCurrent(data.current)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSwitch(name: string) {
    if (!confirm(`Switch to profile "${name}"? Companion will be restarted.`)) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await api.switchProfile(name)
      setMsg(`Switched to "${name}"`)
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await api.createProfile(newName.trim())
      setMsg(`Created profile "${newName.trim()}"`)
      setNewName('')
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2>Profiles</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {msg && <p style={{ color: 'green' }}>{msg}</p>}
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={th}>Branch</th>
            <th style={th}>Last commit</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {branches.map(b => (
            <tr key={b.name} style={{ background: b.name === current ? '#e8f4ff' : undefined }}>
              <td style={td}>
                <code>{b.name}</code>
                {b.name === current && <span style={{ marginLeft: 8, color: '#0066cc', fontSize: 12 }}>(active)</span>}
              </td>
              <td style={td}>{b.lastCommit ? new Date(b.lastCommit.timestamp).toLocaleString() : '—'}</td>
              <td style={td}>
                <button
                  onClick={() => handleSwitch(b.name)}
                  disabled={busy || b.name === current}
                  style={{ ...btnSm, opacity: b.name === current ? 0.4 : 1 }}
                >
                  Switch
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="New profile name"
          style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, flex: 1 }}
        />
        <button onClick={handleCreate} disabled={busy || !newName.trim()} style={btn}>
          New profile
        </button>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 12px', borderBottom: '2px solid #ddd', textAlign: 'left' }
const td: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #eee' }
const btn: React.CSSProperties = { padding: '8px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const btnSm: React.CSSProperties = { ...btn, padding: '4px 10px', fontSize: 13 }
