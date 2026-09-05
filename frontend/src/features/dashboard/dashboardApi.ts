import apiClient from '@/lib/apiClient'
import type { MealLogResponse } from '@/features/meals/mealApi'
import type { WorkoutLogResponse } from '@/features/workouts/workoutApi'

/** Gerasteter Ring-Füllstand: jeder Wert ist 0 | 25 | 50 | 75 | 100 (Prozent gefüllt). */
export interface MacroBuckets {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface TodaySummary {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  buckets: MacroBuckets
  meals: MealLogResponse[]
}

export interface WeekSummary {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  buckets: MacroBuckets
}

export function getTodaySummary(date?: string) {
  return apiClient.get<TodaySummary>('/meals/today', { params: date ? { date } : undefined })
}

export function getWeeklySummary() {
  return apiClient.get<WeekSummary>('/meals/week')
}

export function getTodayWorkouts(date?: string) {
  return apiClient.get<WorkoutLogResponse[]>('/workouts/today', { params: date ? { date } : undefined })
}
