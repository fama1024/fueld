import { RATING_LABELS } from '@/features/log/labels'
import type { GoalRating } from '@/features/meals/mealApi'
import { cn } from '@/lib/utils'

const COLORS: Record<GoalRating, string> = {
  good: 'bg-rating-good',
  neutral: 'bg-rating-neutral',
  poor: 'bg-rating-poor',
}
const ORDER: GoalRating[] = ['good', 'neutral', 'poor']

interface RatingBarProps {
  counts: Record<GoalRating, number>
  dominant: { rating: GoalRating; count: number; rated: number; majority: boolean }
}

/** Verteilung der Ziel-Bewertungen in den gedämpften Farben des Badges, ohne Signalrot und -grün. */
export default function RatingBar({ counts, dominant }: RatingBarProps) {
  const lead = dominant.majority ? 'Überwiegend' : 'Am häufigsten'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-xs" aria-hidden>
        {ORDER.filter(rating => counts[rating] > 0).map(rating => (
          <div key={rating} className={cn('h-full', COLORS[rating])} style={{ flexGrow: counts[rating] }} />
        ))}
      </div>
      <p className="text-caption text-ink-soft">
        {lead} „{RATING_LABELS[dominant.rating]}“, {dominant.count} von {dominant.rated} Mahlzeiten
      </p>
    </div>
  )
}
