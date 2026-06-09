import apiClient from '@/lib/apiClient'

export interface PhotoDto {
  data: string      // base64 string without data: prefix
  mediaType: string // e.g. "image/jpeg"
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealLogRequest {
  text: string
  photos?: PhotoDto[]
  mealType?: MealType | null
  eatenAt?: string | null  // "YYYY-MM-DD"
}

export interface MealLogResponse {
  id: string
  textInput: string
  summary: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  feedback: string | null
  tip: string | null
  goalAlignment: string | null
  ingredientTips: string[] | null
  mealType: MealType | null
  eatenAt: string
  loggedAt: string
}

export function logMeal(data: MealLogRequest) {
  return apiClient.post<MealLogResponse>('/meals', data)
}

export function getMealHistory() {
  return apiClient.get<MealLogResponse[]>('/meals')
}

export function updateMeal(id: string, data: MealLogRequest) {
  return apiClient.put<MealLogResponse>(`/meals/${id}`, data)
}
