import apiClient from '@/lib/apiClient'

export interface ProfileData {
  id: string | null
  goals: string | null
  diet: string | null
  sports: string | null
  bodyWeight: number | null
  height: number | null
  age: number | null
  updatedAt: string | null
}

export function getProfile() {
  return apiClient.get<ProfileData>('/profile')
}

export function saveProfile(data: Omit<ProfileData, 'id' | 'updatedAt'>) {
  return apiClient.put<ProfileData>('/profile', data)
}
