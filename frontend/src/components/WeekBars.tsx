import { cn } from '@/lib/utils'

export interface WeekBarDay {
  label: string
  /** Balkenhöhe 0–100 */
  value: number
  inTarget: boolean
  today: boolean
}

/**
 * Lime heißt im Zielbereich, alles andere bleibt neutral. Tage über dem Ziel sehen
 * bewusst genauso aus wie Tage darunter, die Grafik soll nicht beschämen.
 */
export default function WeekBars({ days }: { days: WeekBarDay[] }) {
  const inTarget = days.filter(d => d.inTarget).length
  return (
    <div role="img" aria-label={`${inTarget} von ${days.length} Tagen im Zielbereich`} className="w-full">
      <div className="flex h-22 items-end gap-1.5">
        {days.map(day => (
          <div
            key={day.label}
            className={cn('min-h-2 flex-1 rounded-xs', day.inTarget ? 'bg-lime' : 'bg-track')}
            style={{ height: `${day.value}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {days.map(day => (
          <div key={day.label} className={cn('flex-1 text-center text-label font-medium', day.today ? 'text-ink' : 'text-ink-muted')}>
            {day.label}
          </div>
        ))}
      </div>
    </div>
  )
}
