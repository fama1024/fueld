import { ArrowDown, ArrowUp, Check } from 'lucide-react'

export interface FocusItem {
  direction: 'more' | 'less' | 'ok'
  text: string
  foods?: string[]
}

const ICONS = { more: ArrowUp, less: ArrowDown, ok: Check }

interface FocusHintProps {
  items: FocusItem[]
  /** Woran sich der Fokus ausrichtet, zum Beispiel Ziel und Ernährungsweise */
  subtitle?: string
  loading?: boolean
}

/** Zeigt eine Richtung, keine Bewertung dessen, was schon gegessen wurde. */
export default function FocusHint({ items, subtitle, loading }: FocusHintProps) {
  return (
    <section aria-label="Fokus" className="flex w-full flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <div>
        <h2 className="text-heading font-semibold text-ink">Dein Fokus</h2>
        {subtitle && <p className="text-caption text-ink-muted">{subtitle}</p>}
      </div>
      {loading && <p className="text-body text-ink-muted">Wird eingeordnet…</p>}
      {!loading && items.map(item => {
        const Icon = ICONS[item.direction]
        return (
          <div key={item.text} className="flex items-start gap-3 text-body text-ink-soft">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <p>{item.text}</p>
              {item.foods && item.foods.length > 0 && (
                <p className="mt-1 text-caption text-ink-muted">Für die nächsten Tage: {item.foods.join(', ')}</p>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
