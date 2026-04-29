import { useState } from 'react'
import Dashboard from './views/Dashboard'
import Profiles from './views/Profiles'
import History from './views/History'
import Settings from './views/Settings'

type View = 'dashboard' | 'profiles' | 'history' | 'settings'

const NAV: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [view, setView] = useState<View>('dashboard')

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Companion Sync</h1>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #ccc', paddingBottom: 8 }}>
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            style={{
              padding: '6px 14px',
              background: view === n.id ? '#0066cc' : '#eee',
              color: view === n.id ? '#fff' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {n.label}
          </button>
        ))}
      </nav>
      {view === 'dashboard' && <Dashboard />}
      {view === 'profiles' && <Profiles />}
      {view === 'history' && <History />}
      {view === 'settings' && <Settings />}
    </div>
  )
}
