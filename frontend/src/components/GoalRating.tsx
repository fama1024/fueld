import type { GoalRating as Rating } from '@/features/meals/mealApi'
import { cn } from '@/lib/utils'

/**
 * Ziel-Bewertung: 3-stufige Kompression von goal_alignment, mit bewusst milder
 * Benennung und gedämpften Farben statt Signalrot/-grün (Scham-Risiko bei einer
 * täglich selbst genutzten App).
 */
const RATINGS: Record<Rating, { label: string; className: string }> = {
  good: { label: 'Passt gut', className: 'bg-rating-good-bg text-rating-good' },
  neutral: { label: 'Geht so', className: 'bg-rating-neutral-bg text-rating-neutral' },
  poor: { label: 'Eher nicht', className: 'bg-rating-poor-bg text-rating-poor' },
}

export default function GoalRating({ rating }: { rating: Rating | null | undefined }) {
  if (!rating) return null
  const { label, className } = RATINGS[rating]
  return (
    <span className={cn('inline-flex min-h-6 items-center gap-1.5 rounded-full px-2 text-label font-medium', className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  )
}
