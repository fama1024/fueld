import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, User, Lightbulb, ShoppingBasket } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/log', icon: UtensilsCrossed, label: 'Log' },
  { to: '/pantry', icon: ShoppingBasket, label: 'Vorrat' },
  { to: '/profile', icon: User, label: 'Profil' },
  { to: '/insights', icon: Lightbulb, label: 'Insights' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background">
        <div className="flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
