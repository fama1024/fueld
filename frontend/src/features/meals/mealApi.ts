import apiClient from '@/lib/apiClient'

export interface PhotoDto {
  data: string      // base64 string without data: prefix
  mediaType: string // e.g. "image/jpeg"
}

export interface MealLogRequest {
  text: string
  photos?: PhotoDto[]
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
  loggedAt: string
}

export function logMeal(data: MealLogRequest) {
  return apiClient.post<MealLogResponse>('/meals', data)
}

export function getMealHistory() {
  return apiClient.get<MealLogResponse[]>('/meals')
}
