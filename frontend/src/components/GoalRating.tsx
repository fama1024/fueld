import { RATING_LABELS } from '@/features/log/labels'
import type { GoalRating as Rating } from '@/features/meals/mealApi'
import { cn } from '@/lib/utils'

/**
 * Ziel-Bewertung: 3-stufige Kompression von goal_alignment, mit bewusst milder
 * Benennung und gedämpften Farben statt Signalrot/-grün (Scham-Risiko bei einer
 * täglich selbst genutzten App).
 */
const COLORS: Record<Rating, string> = {
  good: 'bg-rating-good-bg text-rating-good',
  neutral: 'bg-rating-neutral-bg text-rating-neutral',
  poor: 'bg-rating-poor-bg text-rating-poor',
}

export default function GoalRating({ rating }: { rating: Rating | null | undefined }) {
  if (!rating) return null
  return (
    <span className={cn('inline-flex min-h-6 items-center gap-1.5 rounded-full px-2 text-label font-medium', COLORS[rating])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {RATING_LABELS[rating]}
    </span>
  )
}
