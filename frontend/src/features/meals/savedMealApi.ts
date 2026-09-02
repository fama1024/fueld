import apiClient from '@/lib/apiClient'
import type { MealLogResponse, MealType } from './mealApi'

export interface SavedMeal {
  id: string
  name: string
  textInput: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  lastUsedAt: string
}

export interface SaveMealRequest {
  name: string
  textInput?: string | null
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}

export interface FromSavedMealRequest {
  mealType?: MealType | null
  eatenAt?: string | null // "YYYY-MM-DD"
}

export function getSavedMeals() {
  return apiClient.get<SavedMeal[]>('/saved-meals')
}

export function createSavedMeal(data: SaveMealRequest) {
  return apiClient.post<SavedMeal>('/saved-meals', data)
}

export function deleteSavedMeal(id: string) {
  return apiClient.delete<void>(`/saved-meals/${id}`)
}

export function logMealFromSaved(savedMealId: string, data: FromSavedMealRequest) {
  return apiClient.post<MealLogResponse>(`/meals/from-saved/${savedMealId}`, data)
}
