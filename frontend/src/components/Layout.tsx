import type { ReactNode } from 'react'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f4f6f4' }}>
      <Sidebar />

      <main className="flex-1 pb-20 md:pb-0" style={{ paddingLeft: 0 }}>
        <div className="md:ml-56">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
