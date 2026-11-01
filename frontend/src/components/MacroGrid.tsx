import { cn } from '@/lib/utils'

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat'

export interface GridDay {
  label: string
  today: boolean
}

export interface MacroRow {
  macro: MacroKey
  /** Prozent vom Tagesziel, null bei Tagen ohne Einträge */
  values: (number | null)[]
  average: number | null
}

const MACROS: Record<MacroKey, { label: string; color: string }> = {
  calories: { label: 'Kalorien', color: 'var(--color-macro-calories)' },
  protein: { label: 'Protein', color: 'var(--color-macro-protein)' },
  carbs: { label: 'Carbs', color: 'var(--color-macro-carbs)' },
  fat: { label: 'Fett', color: 'var(--color-macro-fat)' },
}

/**
 * Drei feste Stufen statt eines stufenlosen Verlaufs: Nur so bleibt die Zahl in jeder
 * Zelle auf allen vier Makrofarben lesbar. Über 100 % sieht bewusst aus wie 100 %.
 */
function cellStyle(value: number, color: string) {
  const strength = value < 50 ? 18 : value < 80 ? 40 : 85
  return {
    backgroundColor: `color-mix(in srgb, ${color} ${strength}%, var(--color-surface-1))`,
    color: strength === 85 ? 'var(--color-on-lime)' : 'var(--color-ink)',
  }
}

/** Letzte 7 Tage aller Makros in Prozent vom Tagesziel, damit Lücken ohne Tippen auffallen. */
export default function MacroGrid({ days, rows }: { days: GridDay[]; rows: MacroRow[] }) {
  return (
    <section aria-label="Makros der letzten 7 Tage" className="flex flex-col gap-2">
      <div>
        <h2 className="text-heading font-semibold text-ink">Letzte 7 Tage</h2>
        <p className="text-caption text-ink-muted">Prozent vom Tagesziel, Ø ohne heute</p>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-[3px]">
        <thead>
          <tr>
            <th scope="col" className="w-15"><span className="sr-only">Makro</span></th>
            {days.map((day, index) => (
              <th key={index} scope="col" className={cn('pb-0.5 text-label font-medium', day.today ? 'text-ink' : 'text-ink-muted')}>
                {day.label}
              </th>
            ))}
            <th scope="col" className="w-9 pb-0.5 text-right text-label font-medium text-ink-muted">Ø</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const { label, color } = MACROS[row.macro]
            return (
              <tr key={row.macro}>
                <th scope="row" className="text-left text-label font-medium text-ink-soft">{label}</th>
                {row.values.map((value, index) => (
                  <td key={index} className="p-0">
                    <div
                      className={cn('flex h-8 items-center justify-center rounded-xs text-label font-medium', value === null && 'bg-surface-1 text-ink-muted')}
                      style={value === null ? undefined : cellStyle(value, color)}
                    >
                      {value ?? '–'}
                    </div>
                  </td>
                ))}
                <td className="p-0 text-right text-label font-semibold text-ink">{row.average ?? '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
