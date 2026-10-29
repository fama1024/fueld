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

export function syncGarmin() {
  return apiClient.post<GarminSyncResponse>('/garmin/sync')
}
