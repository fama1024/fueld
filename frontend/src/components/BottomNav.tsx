import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, CalendarDays, MoreHorizontal } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/log', icon: ClipboardList, label: 'Log' },
  { to: '/calendar', icon: CalendarDays, label: 'Kalender' },
  { to: '/more', icon: MoreHorizontal, label: 'Mehr' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex-shrink-0 flex items-center justify-around px-2 pt-2"
      style={{
        background: '#fff',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        height: 64,
      }}>
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className="flex flex-col items-center gap-0.5 flex-1 py-1"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {({ isActive }) => (
            <>
              <div
                className="flex items-center justify-center rounded-xl transition-all"
                style={{
                  width: 36,
                  height: 28,
                  background: isActive ? '#dbeafe' : 'transparent',
                }}
              >
                <Icon
                  size={20}
                  color={isActive ? '#2563EB' : '#a0b0a5'}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563EB' : '#a0b0a5',
              }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
