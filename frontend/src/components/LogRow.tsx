import { Dumbbell, Utensils } from 'lucide-react'
import GoalRating from './GoalRating'
import type { GoalRating as Rating } from '@/features/meals/mealApi'

interface LogRowProps {
  kind: 'meal' | 'workout'
  title: string
  meta?: string
  rating?: Rating | null
  onClick: () => void
}

/** Eine Zeile für Mahlzeit oder Training: bewusst ohne Uhrzeit und Makrowerte. */
export default function LogRow({ kind, title, meta, rating, onClick }: LogRowProps) {
  const Icon = kind === 'workout' ? Dumbbell : Utensils
  return (
    <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-3 rounded-md bg-surface-1 p-3 text-left active:bg-surface-2">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-ink-soft">
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-ink">{title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2">
          {meta && <span className="text-caption text-ink-muted">{meta}</span>}
          <GoalRating rating={rating} />
        </span>
      </span>
    </button>
  )
}
