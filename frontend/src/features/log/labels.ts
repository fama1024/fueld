import type { GoalRating, MealLogResponse, MealType } from '@/features/meals/mealApi'
import type { WorkoutExercise, WorkoutLogResponse, WorkoutType } from '@/features/workouts/workoutApi'
import { dateKeyOf, dateLabel, timeLabel } from '@/lib/date'

export const RATING_LABELS: Record<GoalRating, string> = {
  good: 'Passt gut',
  neutral: 'Geht so',
  poor: 'Eher nicht',
}

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'lunch', label: 'Mittagessen' },
  { value: 'dinner', label: 'Abendessen' },
  { value: 'snack', label: 'Snack' },
]

export const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'running', label: 'Laufen' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'cycling', label: 'Radfahren' },
  { value: 'other', label: 'Sonstiges' },
]

/** Mahlzeit-Typ nach Tageszeit, damit das Schnell-Eintragen ohne Nachfrage auskommt. */
export function mealTypeForNow(now = new Date()): MealType {
  const hour = now.getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 22) return 'dinner'
  return 'snack'
}

export function mealTitle(meal: MealLogResponse) {
  return meal.summary || meal.textInput
}

export function mealMeta(meal: MealLogResponse) {
  return MEAL_TYPES.find(t => t.value === meal.mealType)?.label
}

export function workoutTitle(workout: WorkoutLogResponse) {
  return WORKOUT_TYPES.find(t => t.value === workout.type)?.label ?? workout.type
}

/** "3 Sätze · 30 Wdh. · max. 80 kg". Die Dauer nur, wenn es keine Wiederholungen gibt (z.B. Plank). */
export function exerciseMeta(exercise: WorkoutExercise) {
  const parts = [
    exercise.sets ? `${exercise.sets} ${exercise.sets === 1 ? 'Satz' : 'Sätze'}` : null,
    exercise.reps ? `${exercise.reps} Wdh.` : null,
    exercise.maxWeightKg ? `max. ${String(exercise.maxWeightKg).replace('.', ',')} kg` : null,
    !exercise.reps && exercise.durationSeconds ? secondsLabel(exercise.durationSeconds) : null,
  ]
  return parts.filter(Boolean).join(' · ')
}

function secondsLabel(seconds: number) {
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min`
}

/** "Heute · 07:12 Uhr". Eine Uhrzeit gibt es nur von Garmin, sonst steht dort ein Platzhalter. */
export function workoutWhen(workout: WorkoutLogResponse) {
  const day = dateLabel(dateKeyOf(workout.performedAt))
  return workout.fromGarmin ? `${day} · ${timeLabel(workout.performedAt)} Uhr` : day
}

export function workoutMeta(workout: WorkoutLogResponse) {
  const parts = [
    workout.fromGarmin ? `${timeLabel(workout.performedAt)} Uhr` : null,
    workout.distanceKm ? `${String(workout.distanceKm).replace('.', ',')} km` : null,
    workout.durationMinutes ? `${workout.durationMinutes} min` : null,
    !workout.distanceKm && workout.caloriesBurned ? `${workout.caloriesBurned} kcal` : null,
  ]
  return parts.filter(Boolean).join(' · ')
}
