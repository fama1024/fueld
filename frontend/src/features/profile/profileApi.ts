import apiClient from '@/lib/apiClient'

export type Gender = 'male' | 'female' | 'diverse'
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'

export interface ProfileData {
  id: string | null
  name: string | null
  goals: string | null
  diet: string | null
  sports: string | null
  bodyWeight: number | null
  height: number | null
  age: number | null
  gender: Gender | null
  activityLevel: ActivityLevel | null
  updatedAt: string | null
  goalTags: string[] | null
}

export interface GoalsData {
  calories: number
  protein: number
  carbs: number
  fat: number
  hasEnoughData: boolean
}

export function getProfile() {
  return apiClient.get<ProfileData>('/profile')
}

export function saveProfile(data: Omit<ProfileData, 'id' | 'updatedAt'>) {
  return apiClient.put<ProfileData>('/profile', data)
}


export function getGoals() {
  return apiClient.get<GoalsData>('/profile/goals')
}
