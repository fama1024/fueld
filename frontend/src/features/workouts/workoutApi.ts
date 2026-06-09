import apiClient from '@/lib/apiClient'

export type WorkoutType = 'running' | 'crossfit' | 'cycling' | 'other'

export interface PhotoDto {
  data: string
  mediaType: string
}

export interface WorkoutLogRequest {
  type: WorkoutType
  durationMinutes?: number
  notes?: string
  photos?: PhotoDto[]
  performedAt?: string | null  // "YYYY-MM-DD"
}

export interface WorkoutLogResponse {
  id: string
  type: WorkoutType
  durationMinutes: number | null
  notes: string | null
  summary: string | null
  feedback: string | null
  missingData: string[] | null
  distanceKm: number | null
  pacePerKm: string | null
  avgHeartRate: number | null
  maxHeartRate: number | null
  caloriesBurned: number | null
  performedAt: string
  loggedAt: string
}

export function logWorkout(data: WorkoutLogRequest) {
  return apiClient.post<WorkoutLogResponse>('/workouts', data)
}

export function getWorkoutHistory() {
  return apiClient.get<WorkoutLogResponse[]>('/workouts')
}

export function updateWorkout(id: string, data: WorkoutLogRequest) {
  return apiClient.put<WorkoutLogResponse>(`/workouts/${id}`, data)
}
