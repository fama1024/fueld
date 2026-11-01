import type { GoalRating, MealLogResponse } from '@/features/meals/mealApi'
import type { SavedMeal } from '@/features/meals/savedMealApi'
import type { WorkoutLogResponse, WorkoutType } from '@/features/workouts/workoutApi'
import { dateKeyOf, localDateKey } from '@/lib/date'

const QUICK_MEALS_MAX = 4
const MIN_REPEATS = 2
export const MIN_RATED_MEALS = 4

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function daysAgo(now: Date, days: number) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  date.setDate(date.getDate() - days)
  return date
}

/** Einträge nach Tagen gruppieren, die Reihenfolge der Eingabe bleibt erhalten. */
export function groupByDay<T>(items: T[], dateOf: (item: T) => string) {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = dateKeyOf(dateOf(item))
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()]
}

/** Ziel-Bewertungen der letzten 7 Tage inklusive heute. Mahlzeiten ohne Bewertung zählen nicht. */
export function ratingCounts(meals: MealLogResponse[], now = new Date()) {
  const start = localDateKey(daysAgo(now, 6))
  const counts: Record<GoalRating, number> = { good: 0, neutral: 0, poor: 0 }
  for (const meal of meals) {
    if (meal.goalRating && dateKeyOf(meal.eatenAt) >= start) counts[meal.goalRating]++
  }
  return counts
}

/** Bei Gleichstand gewinnt der positivere Wert. */
export function dominantRating(counts: Record<GoalRating, number>) {
  const order: GoalRating[] = ['good', 'neutral', 'poor']
  const rated = counts.good + counts.neutral + counts.poor
  const rating = order.reduce((best, next) => (counts[next] > counts[best] ? next : best))
  return { rating, count: counts[rating], rated, majority: counts[rating] * 2 > rated }
}

export function dayTotals(meals: MealLogResponse[]) {
  return {
    calories: meals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
    protein: meals.reduce((sum, meal) => sum + (meal.protein ?? 0), 0),
  }
}

/** Gespeicherte Mahlzeiten zuerst, danach was mehrfach eingetragen wurde, ohne Dopplungen. */
export function quickMeals(saved: SavedMeal[], meals: MealLogResponse[]) {
  const seen = new Set<string>()
  const result: { label: string; text: string }[] = []
  const add = (label: string, text: string) => {
    const key = normalize(text)
    if (!seen.has(key) && result.length < QUICK_MEALS_MAX) {
      seen.add(key)
      result.push({ label, text })
    }
  }

  for (const meal of saved) add(meal.name, meal.textInput || meal.name)

  // Der eigene Text ist der Schlüssel: Die KI-Zusammenfassung fällt für dieselbe Eingabe unterschiedlich aus.
  const repeated = new Map<string, { label: string; text: string; count: number }>()
  for (const meal of meals) {
    const text = meal.textInput || meal.summary || ''
    const key = normalize(text)
    if (!key) continue
    const entry = repeated.get(key)
    if (entry) entry.count++
    else repeated.set(key, { label: meal.summary || text, text, count: 1 })
  }
  ;[...repeated.values()]
    .filter(entry => entry.count >= MIN_REPEATS)
    .sort((a, b) => b.count - a.count)
    .forEach(entry => add(entry.label, entry.text))

  return result
}

export interface WorkoutPeriod {
  count: number
  minutes: number
  distanceKm: number
}

function summarize(workouts: WorkoutLogResponse[]): WorkoutPeriod {
  return {
    count: workouts.length,
    minutes: workouts.reduce((sum, w) => sum + (w.durationMinutes ?? 0), 0),
    distanceKm: workouts.reduce((sum, w) => sum + (w.distanceKm ?? 0), 0),
  }
}

/** Letzte 7 Tage inklusive heute und die 7 Tage davor. */
export function workoutPeriods(workouts: WorkoutLogResponse[], now = new Date()) {
  const start = localDateKey(daysAgo(now, 6))
  const previousStart = localDateKey(daysAgo(now, 13))
  const dateOf = (w: WorkoutLogResponse) => dateKeyOf(w.performedAt)
  const recent = workouts.filter(w => dateOf(w) >= start)
  return {
    recent,
    current: summarize(recent),
    previous: summarize(workouts.filter(w => dateOf(w) >= previousStart && dateOf(w) < start)),
  }
}

export function workoutsByType(workouts: WorkoutLogResponse[]) {
  const counts = new Map<WorkoutType, number>()
  for (const workout of workouts) counts.set(workout.type, (counts.get(workout.type) ?? 0) + 1)
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} h`
}

export function formatDistance(km: number) {
  return `${km.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km`
}
