import apiClient from '@/lib/apiClient'
import type { MealLogResponse } from '@/features/meals/mealApi'
import type { WorkoutLogResponse } from '@/features/workouts/workoutApi'

export interface TodaySummary {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  meals: MealLogResponse[]
}

export interface WeekSummary {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

export function getTodaySummary() {
  return apiClient.get<TodaySummary>('/meals/today')
}

export function getWeeklySummary() {
  return apiClient.get<WeekSummary>('/meals/week')
}

export function getTodayWorkouts() {
  return apiClient.get<WorkoutLogResponse[]>('/workouts/today')
}
