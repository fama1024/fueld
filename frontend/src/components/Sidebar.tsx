import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, Package, User, Sparkles } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/log', icon: ClipboardList, label: 'Log' },
  { to: '/calendar', icon: CalendarDays, label: 'Kalender' },
  { to: '/pantry', icon: Package, label: 'Vorrat' },
  { to: '/profile', icon: User, label: 'Profil' },
  { to: '/insights', icon: Sparkles, label: 'Insights' },
]

export default function Sidebar() {
  return (
    <nav className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col gap-1 p-3"
      style={{
        width: 224,
        background: '#fff',
        borderRight: '1px solid rgba(0,0,0,0.06)',
      }}>
      <div className="px-3 py-4" style={{ fontSize: 18, fontWeight: 700, color: '#16A34A' }}>Fueld</div>
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'}>
          {({ isActive }) => (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: isActive ? '#dcfce7' : 'transparent' }}>
              <Icon
                size={20}
                color={isActive ? '#16A34A' : '#5a6b5e'}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span style={{
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#16A34A' : '#5a6b5e',
              }}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
