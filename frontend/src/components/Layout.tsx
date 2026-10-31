import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import { QUICK_ENTRY_INPUT_ID } from './QuickEntry'
import AddSheet from '@/features/log/AddSheet'
import EntrySheet from '@/features/log/EntrySheet'
import { LogContext, type LogEntry } from '@/features/log/LogContext'

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [version, setVersion] = useState(0)
  const [addText, setAddText] = useState<string | null>(null)
  const [entry, setEntry] = useState<LogEntry | null>(null)

  const changed = useCallback(() => setVersion(v => v + 1), [])
  const closeAdd = useCallback(() => setAddText(null), [])
  const closeEntry = useCallback(() => setEntry(null), [])
  const context = useMemo(() => ({
    version,
    changed,
    openAdd: (initialText = '') => setAddText(initialText),
    openEntry: setEntry,
  }), [version, changed])

  function handleAdd() {
    const quickEntry = pathname === '/' ? document.getElementById(QUICK_ENTRY_INPUT_ID) : null
    if (quickEntry) {
      quickEntry.scrollIntoView({ behavior: 'smooth', block: 'center' })
      quickEntry.focus()
    } else {
      setAddText('')
    }
  }

  return (
    <LogContext.Provider value={context}>
      <main className="mx-auto min-h-screen max-w-content px-4 pt-6" style={{ paddingBottom: 'calc(var(--spacing-nav-clearance) + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      <BottomNav onAdd={handleAdd} />
      {addText !== null && <AddSheet initialText={addText} onClose={closeAdd} />}
      {entry && <EntrySheet key={entry.kind === 'meal' ? entry.meal.id : entry.workout.id} entry={entry} onClose={closeEntry} />}
    </LogContext.Provider>
  )
}
