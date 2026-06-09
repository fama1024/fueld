import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Package, User, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/log', icon: ClipboardList, label: 'Log' },
  { to: '/pantry', icon: Package, label: 'Vorrat' },
  { to: '/insights', icon: Sparkles, label: 'Insights' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f4f6f4' }}>
      <main className="flex-1 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex-shrink-0 flex items-center justify-around px-2 pt-2"
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
                    background: isActive ? '#dcfce7' : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    color={isActive ? '#16A34A' : '#a0b0a5'}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#16A34A' : '#a0b0a5',
                }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
