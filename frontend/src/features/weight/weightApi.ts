import apiClient from '@/lib/apiClient'

export interface BodyCompositionResult {
  weight: number | null
  bmi: number | null
  bodyFatPct: number | null
  muscleMassPct: number | null
  boneMassKg: number | null
  waterPct: number | null
}

export interface WeightEntry {
  id: string
  weight: number
  bmi: number | null
  bodyFatPct: number | null
  muscleMassPct: number | null
  boneMassKg: number | null
  waterPct: number | null
  loggedAt: string
}

export function logWeight(data: { weight: number } & Partial<Omit<BodyCompositionResult, 'weight'>>) {
  return apiClient.post<WeightEntry>('/weight', data)
}

export function analyzeWeightScreenshot(photo: { data: string; mediaType: string }) {
  return apiClient.post<BodyCompositionResult>('/weight/analyze', photo)
}

export function getWeightHistory() {
  return apiClient.get<WeightEntry[]>('/weight')
}

export function getWeightEntry(id: string) {
  return apiClient.get<WeightEntry>(`/weight/${id}`)
}

export function deleteWeight(id: string) {
  return apiClient.delete<void>(`/weight/${id}`)
}
