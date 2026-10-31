import { cn } from '@/lib/utils'

const MACROS = {
  calories: { label: 'Kalorien', on: 'bg-macro-calories' },
  protein: { label: 'Protein', on: 'bg-macro-protein' },
  carbs: { label: 'Kohlenhydrate', on: 'bg-macro-carbs' },
  fat: { label: 'Fett', on: 'bg-macro-fat' },
}

/** Tendenz in vier Stufen statt exakter Zahl. `bucket` kommt gerastet vom Server (0–100 in 25er-Schritten). */
export default function MacroBar({ macro, bucket }: { macro: keyof typeof MACROS; bucket: number }) {
  const { label, on } = MACROS[macro]
  const filled = Math.round(Math.min(Math.max(bucket, 0), 100) / 25)
  return (
    <div role="img" aria-label={`${label}: ${filled} von 4 Stufen`} className="grid w-full grid-cols-[96px_1fr] items-center gap-3">
      <span className="text-caption text-ink-soft">{label}</span>
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className={cn('h-2.5 rounded-xs', step <= filled ? on : 'bg-track')} />
        ))}
      </div>
    </div>
  )
}
