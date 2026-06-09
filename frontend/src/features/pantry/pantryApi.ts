import apiClient from '@/lib/apiClient'

export interface PantryItem {
  id: string
  name: string
  quantity: string | null
  addedAt: string
}

export interface IngredientRating {
  name: string
  stars: number
  reason: string
}

export interface PantryRecipe {
  name: string
  ingredients: string[]
  steps: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  goalFit: string | null
}

export interface PantryAnalysis {
  ingredientRatings: IngredientRating[]
  recipes: PantryRecipe[]
}

export function getPantryItems() {
  return apiClient.get<PantryItem[]>('/pantry')
}

export function addPantryItems(items: { name: string; quantity?: string }[]) {
  return apiClient.post<PantryItem[]>('/pantry/items', { items })
}

export function deletePantryItem(id: string) {
  return apiClient.delete<void>(`/pantry/items/${id}`)
}

export function extractPantryFromPhoto(data: string, mediaType: string) {
  return apiClient.post<string[]>('/pantry/extract', { data, mediaType })
}

export function analyzePantry(note?: string) {
  return apiClient.post<PantryAnalysis>('/pantry/analyze', { note: note ?? null })
}
