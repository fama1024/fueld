import { ArrowDown, ArrowUp, Check } from 'lucide-react'

export interface FocusItem {
  direction: 'more' | 'less' | 'ok'
  text: string
}

const ICONS = { more: ArrowUp, less: ArrowDown, ok: Check }

/** Zeigt eine Richtung, keine Bewertung dessen, was schon gegessen wurde. */
export default function FocusHint({ items }: { items: FocusItem[] }) {
  return (
    <section aria-label="Fokus" className="flex w-full flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <h2 className="text-heading font-semibold text-ink">Dein Fokus</h2>
      {items.map(item => {
        const Icon = ICONS[item.direction]
        return (
          <div key={item.text} className="flex items-start gap-3 text-body text-ink-soft">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
              <Icon size={18} aria-hidden />
            </span>
            <span>{item.text}</span>
          </div>
        )
      })}
    </section>
  )
}
