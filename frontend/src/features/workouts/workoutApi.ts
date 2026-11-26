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

/** Eine Übung aus Garmin, über alle ihre Sätze zusammengefasst. `name` null: von Garmin nicht erkannt. */
export interface WorkoutExercise {
  name: string | null
  sets: number | null
  reps: number | null
  maxWeightKg: number | null
  volumeKg: number | null
  durationSeconds: number | null
}

/** Von der Garmin-Uhr gemessen: aerob und anaerob je 0 bis 5. */
export interface TrainingEffect {
  aerobic: number | null
  anaerobic: number | null
  label: string | null
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
  garminTypeKey: string | null
  garminDescription: string | null
  exercises: WorkoutExercise[] | null
  /** Nur dann ist die Uhrzeit in `performedAt` die echte Startzeit. */
  fromGarmin: boolean
  trainingEffect: TrainingEffect | null
  /** Grobe Einschätzung der KI, erst nach einer Einordnung gefüllt. */
  muscles: string[] | null
  benefits: string[] | null
}

export interface QuickWorkoutRequest {
  type: WorkoutType
  durationMinutes?: number
  notes?: string
  performedAt?: string | null
  distanceKm?: number | null
  pacePerKm?: string | null
  avgHeartRate?: number | null
  maxHeartRate?: number | null
  caloriesBurned?: number | null
}

export function logWorkout(data: WorkoutLogRequest) {
  return apiClient.post<WorkoutLogResponse>('/workouts', data)
}

export function quickLogWorkout(data: QuickWorkoutRequest) {
  return apiClient.post<WorkoutLogResponse>('/workouts/quick', data)
}

/** Ohne `since` kommt die gesamte Historie, bei Garmin-Import kann das sehr viel sein. */
export function getWorkoutHistory(since?: string) {
  return apiClient.get<WorkoutLogResponse[]>('/workouts', { params: since ? { since } : undefined })
}

export function getWorkout(id: string) {
  return apiClient.get<WorkoutLogResponse>(`/workouts/${id}`)
}

export function updateWorkout(id: string, data: WorkoutLogRequest) {
  return apiClient.put<WorkoutLogResponse>(`/workouts/${id}`, data)
}
