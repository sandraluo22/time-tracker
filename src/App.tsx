import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Timer as TimerIcon, CalendarDays, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import Timer from './pages/Timer'
import Timeline from './pages/Timeline'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import './index.css'

const navItems = [
  { to: '/', icon: TimerIcon, label: 'Timer' },
  { to: '/timeline', icon: CalendarDays, label: 'Timeline' },
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-dvh">
        <Routes>
          <Route path="/" element={<Timer />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>

        {/* Bottom navigation */}
        <nav
          className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          style={{ backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}
        >
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
              style={({ isActive }) => ({
                color: isActive ? '#818cf8' : '#64748b',
              })}
            >
              <Icon size={22} />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </BrowserRouter>
  )
}
