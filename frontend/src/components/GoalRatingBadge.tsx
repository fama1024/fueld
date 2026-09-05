import type { GoalRating } from '@/features/meals/mealApi'

/**
 * Ziel-Ampel: glanceable Kompression von goal_alignment auf 3 Stufen, mit
 * bewusst milder Benennung und gedämpften Farben statt Signalrot/-grün
 * (Scham-/Demotivationsrisiko bei einer täglich selbst genutzten App).
 */
const CONFIG: Record<GoalRating, { label: string; color: string; bg: string }> = {
  good:    { label: 'Passt gut',  color: '#4d8a63', bg: '#e6f2ea' },
  neutral: { label: 'Geht so',    color: '#78716c', bg: '#f5f5f4' },
  poor:    { label: 'Eher nicht', color: '#b8794f', bg: '#f5ece3' },
}

export default function GoalRatingBadge({ rating }: { rating: GoalRating | null | undefined }) {
  if (!rating) return null
  const c = CONFIG[rating]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: c.bg, fontSize: 11, fontWeight: 600, color: c.color }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, background: c.color, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}
