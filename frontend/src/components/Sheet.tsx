import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Sheet({ title, onClose, children }: SheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-content overflow-y-auto rounded-t-lg bg-surface-2 px-4 pt-2"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex min-h-tap items-center justify-between">
          <h2 className="text-heading font-semibold text-ink">{title}</h2>
          <button type="button" aria-label="Schließen" onClick={onClose} className="-mr-3 grid size-tap place-items-center text-ink-soft">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-3">{children}</div>
      </section>
    </div>
  )
}
