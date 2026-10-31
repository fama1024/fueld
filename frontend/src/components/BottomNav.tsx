import { NavLink } from 'react-router-dom'
import { History, House, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { to: '/', icon: House, label: 'Heute' },
  { to: '/verlauf', icon: History, label: 'Verlauf' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export default function BottomNav({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="fixed inset-x-0 z-40 mx-auto flex max-w-content items-center gap-2 px-3"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <nav aria-label="Hauptnavigation" className="flex min-h-nav min-w-0 flex-1 gap-1 rounded-full border border-hairline bg-surface-2 p-[5px] shadow-float">
        {ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            aria-label={label}
            className={({ isActive }) => cn(
              'flex min-h-tap min-w-0 items-center justify-center gap-1.5 rounded-full text-label font-medium',
              isActive ? 'flex-[1.8] bg-lime text-on-lime' : 'flex-1 text-ink-soft',
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={22} aria-hidden />
                {isActive && label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        aria-label="Eintragen"
        onClick={onAdd}
        className="grid size-nav shrink-0 place-items-center rounded-full bg-lime text-on-lime shadow-float active:bg-lime-press"
      >
        <Plus size={24} aria-hidden />
      </button>
    </div>
  )
}
