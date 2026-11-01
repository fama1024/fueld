import apiClient from '@/lib/apiClient'

export interface GarminStatusResponse {
  available: boolean
  connected: boolean
  email: string | null
}

export interface GarminSyncResponse {
  imported: number
  skipped: number
}

export function getGarminStatus() {
  return apiClient.get<GarminStatusResponse>('/garmin/status')
}

// apiKey leer lassen behält den bisherigen Key, das Backend gibt ihn nie zurück
export function saveGarminConnection(email: string, apiKey?: string) {
  return apiClient.put<GarminStatusResponse>('/garmin/connection', { email, apiKey })
}

export function removeGarminConnection() {
  return apiClient.delete<GarminStatusResponse>('/garmin/connection')
}

// days: wie weit zurück importiert wird (Server-Standard 7; für die ganze Historie 3650)
export function syncGarmin(days?: number) {
  return apiClient.post<GarminSyncResponse>('/garmin/sync', null, { params: days ? { days } : undefined })
}
