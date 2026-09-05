import apiClient from '@/lib/apiClient'

export interface PhotoDto {
  data: string      // base64 string without data: prefix
  mediaType: string // e.g. "image/jpeg"
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** Ziel-Ampel: grobe Kompression von goal_alignment auf 3 Stufen. */
export type GoalRating = 'good' | 'neutral' | 'poor'

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
  goalRating: GoalRating | null
  ingredientTips: string[] | null
  mealType: MealType | null
  eatenAt: string
  loggedAt: string
}

export interface QuickMealRequest {
  text: string
  summary?: string | null
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  mealType?: MealType | null
}

export function logMeal(data: MealLogRequest) {
  return apiClient.post<MealLogResponse>('/meals', data)
}

export function quickLogMeal(data: QuickMealRequest) {
  return apiClient.post<MealLogResponse>('/meals/quick', data)
}

export function getMealHistory() {
  return apiClient.get<MealLogResponse[]>('/meals')
}

export function getMeal(id: string) {
  return apiClient.get<MealLogResponse>(`/meals/${id}`)
}

export function updateMeal(id: string, data: MealLogRequest) {
  return apiClient.put<MealLogResponse>(`/meals/${id}`, data)
}

export interface DayTotal {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function getMealTrend(days: 7 | 30) {
  return apiClient.get<DayTotal[]>('/meals/trend', { params: { days } })
}
