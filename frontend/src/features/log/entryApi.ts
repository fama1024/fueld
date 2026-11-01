import apiClient from '@/lib/apiClient'
import type { MealType, PhotoDto } from '@/features/meals/mealApi'

/** Erkannter Eintrag, noch nicht gespeichert. `mealType: null` bei einer Mahlzeit heißt: Rückfrage nötig. */
export interface EntryDraft {
  kind: 'meal' | 'workout'
  text: string | null
  date: string
  summary: string | null
  feedback: string | null
  mealType: MealType | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  goalAlignment: string | null
  goalRating: string | null
  workoutType: string | null
  durationMinutes: number | null
  distanceKm: number | null
  pacePerKm: string | null
  caloriesBurned: number | null
  /** Nur Training, Format "quads:primary,glutes:secondary", wird vom Server geprüft */
  muscleGroups: string | null
}

export interface EntryParseResponse {
  items: EntryDraft[]
  message: string | null
}

export interface EntryConfirmResponse {
  meals: number
  workouts: number
}

export function parseEntry(text: string, photos?: PhotoDto[]) {
  return apiClient.post<EntryParseResponse>('/entries/parse', { text, photos })
}

export function confirmEntries(items: EntryDraft[]) {
  return apiClient.post<EntryConfirmResponse>('/entries/confirm', { items })
}
