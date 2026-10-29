import apiClient from '@/lib/apiClient'

export interface GarminStatusResponse {
  enabled: boolean
}

export interface GarminSyncResponse {
  imported: number
  skipped: number
}

export function getGarminStatus() {
  return apiClient.get<GarminStatusResponse>('/garmin/status')
}

// days: wie weit zurück importiert wird (Server-Standard 7; für die ganze Historie 3650)
export function syncGarmin(days?: number) {
  return apiClient.post<GarminSyncResponse>('/garmin/sync', null, { params: days ? { days } : undefined })
}
