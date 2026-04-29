import { useEffect, useState } from 'react'
import { api, AppConfig } from '../api'

export default function Settings() {
  const [config, setConfig] = useState<Partial<AppConfig>>({})
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getSettings().then(setConfig).catch(e => setError(String(e)))
  }, [])

  function set(key: keyof AppConfig, value: unknown) {
    setConfig(c => ({ ...c, [key]: value }))
  }

  function setRemote(key: keyof AppConfig['remote'], value: string) {
    setConfig(c => ({ ...c, remote: { ...(c.remote ?? { url: '', username: '', token: '' }), [key]: value } }))
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await api.saveSettings(config)
      setMsg('Settings saved')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleTestRemote() {
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      const r = await api.testRemote()
      setMsg(r.ok ? 'Remote reachable' : `Remote unreachable: ${r.error ?? ''}`)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleTestCompanion() {
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      const r = await api.testCompanion()
      setMsg(r.ok ? 'Companion executable found' : `Not found: ${r.error ?? ''}`)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2>Settings</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {msg && <p style={{ color: 'green' }}>{msg}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
        <label style={labelStyle}>
          Companion config dir
          <input style={inputStyle} value={config.companionConfigDir ?? ''} onChange={e => set('companionConfigDir', e.target.value)} />
        </label>
        <label style={labelStyle}>
          Companion executable
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={config.companionExe ?? ''} onChange={e => set('companionExe', e.target.value)} />
            <button onClick={handleTestCompanion} disabled={busy} style={btnSm}>Test</button>
          </div>
        </label>
        <label style={labelStyle}>
          Companion port
          <input style={inputStyle} type="number" value={config.companionPort ?? 8000} onChange={e => set('companionPort', Number(e.target.value))} />
        </label>
        <label style={labelStyle}>
          Git repo dir
          <input style={inputStyle} value={config.gitRepoDir ?? ''} onChange={e => set('gitRepoDir', e.target.value)} />
        </label>
        <label style={labelStyle}>
          Remote URL
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={config.remote?.url ?? ''} onChange={e => setRemote('url', e.target.value)} />
            <button onClick={handleTestRemote} disabled={busy} style={btnSm}>Test</button>
          </div>
        </label>
        <label style={labelStyle}>
          Remote username
          <input style={inputStyle} value={config.remote?.username ?? ''} onChange={e => setRemote('username', e.target.value)} />
        </label>
        <label style={labelStyle}>
          Remote token
          <input style={inputStyle} type="password" value={config.remote?.token ?? ''} onChange={e => setRemote('token', e.target.value)} placeholder="Leave blank to keep existing" />
        </label>
        <label style={labelStyle}>
          Sync interval (ms)
          <input style={inputStyle} type="number" value={config.syncIntervalMs ?? 300000} onChange={e => set('syncIntervalMs', Number(e.target.value))} />
        </label>
        <button onClick={handleSave} disabled={busy} style={btn}>Save</button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }
const inputStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }
const btn: React.CSSProperties = { padding: '8px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', alignSelf: 'flex-start' }
const btnSm: React.CSSProperties = { ...btn, padding: '6px 10px', fontSize: 13 }
