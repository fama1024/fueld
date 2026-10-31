import type { MealLogResponse, MealType } from '@/features/meals/mealApi'
import type { WorkoutLogResponse, WorkoutType } from '@/features/workouts/workoutApi'

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

export function workoutMeta(workout: WorkoutLogResponse) {
  const parts = [
    workout.distanceKm ? `${String(workout.distanceKm).replace('.', ',')} km` : null,
    workout.durationMinutes ? `${workout.durationMinutes} min` : null,
    !workout.distanceKm && workout.caloriesBurned ? `${workout.caloriesBurned} kcal` : null,
  ]
  return parts.filter(Boolean).join(' · ')
}
