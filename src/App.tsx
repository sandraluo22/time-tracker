import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Timer as TimerIcon, CalendarDays, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import Timer from './pages/Timer'
import Timeline from './pages/Timeline'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import { getSupabaseConfig, subscribeToRealtime, syncToCloud } from './supabase'
import './index.css'

const navItems = [
  { to: '/', icon: TimerIcon, label: 'Timer' },
  { to: '/timeline', icon: CalendarDays, label: 'Timeline' },
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export default function App() {
  useEffect(() => {
    if (getSupabaseConfig()) {
      syncToCloud().catch(() => {})
      subscribeToRealtime()
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="flex flex-col h-full">
        <div className="safe-top shrink-0" style={{ backgroundColor: '#0f172a' }} />

        <div className="page-scroll">
          <div style={{ width: '100%', maxWidth: 672, margin: '0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Timer />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>

        <nav
          className="shrink-0 border-t border-white/5"
          style={{
            backgroundColor: '#1e293b',
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          }}
        >
          <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingTop: 8 }}>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className="flex flex-col items-center gap-0.5 px-4 py-1"
                style={({ isActive }) => ({
                  color: isActive ? '#818cf8' : '#64748b',
                })}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </BrowserRouter>
  )
}
