import apiClient from '@/lib/apiClient'

export interface PantryItem {
  id: string
  name: string
  quantity: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  addedAt: string
}

export interface PantryExtractedItem {
  name: string
  quantity: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
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

export function addPantryItems(items: {
  name: string
  quantity?: string
  caloriesPer100g?: number | null
  proteinPer100g?: number | null
  carbsPer100g?: number | null
  fatPer100g?: number | null
}[]) {
  return apiClient.post<PantryItem[]>('/pantry/items', { items })
}

export function deletePantryItem(id: string) {
  return apiClient.delete<void>(`/pantry/items/${id}`)
}

export function extractPantryFromPhoto(data: string, mediaType: string) {
  return apiClient.post<PantryExtractedItem[]>('/pantry/extract', { data, mediaType })
}

export function analyzePantry(note?: string) {
  return apiClient.post<PantryAnalysis>('/pantry/analyze', { note: note ?? null })
}
