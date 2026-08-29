import { Link } from 'react-router-dom'
import { Package, User, Sparkles, ChevronRight } from 'lucide-react'

const items = [
  { to: '/pantry', icon: Package, label: 'Vorrat' },
  { to: '/profile', icon: User, label: 'Profil' },
  { to: '/insights', icon: Sparkles, label: 'Insights' },
]

export default function MorePage() {
  return (
    <div className="p-4 pt-6">
      <h1 className="mb-4" style={{ fontSize: 20, fontWeight: 700, color: '#111816' }}>Mehr</h1>
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        {items.map(({ to, icon: Icon, label }, i) => (
          <Link key={to} to={to}
            className="flex items-center gap-3 p-4"
            style={{ borderTop: i > 0 ? '1px solid #eef1ee' : 'none' }}>
            <Icon size={20} color="#16A34A" />
            <span className="flex-1" style={{ fontSize: 15, fontWeight: 600, color: '#111816' }}>{label}</span>
            <ChevronRight size={18} color="#a0b0a5" />
          </Link>
        ))}
      </div>
    </div>
  )
}
