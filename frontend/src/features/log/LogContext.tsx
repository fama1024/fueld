import { createContext, useContext } from 'react'
import type { MealLogResponse } from '@/features/meals/mealApi'
import type { WorkoutLogResponse } from '@/features/workouts/workoutApi'

export type LogEntry =
  | { kind: 'meal'; meal: MealLogResponse }
  | { kind: 'workout'; workout: WorkoutLogResponse }

interface LogContextValue {
  /** Steigt nach jeder Änderung, Screens laden darauf neu. */
  version: number
  changed: () => void
  openAdd: (initialText?: string) => void
  openEntry: (entry: LogEntry) => void
}

export const LogContext = createContext<LogContextValue | null>(null)

export function useLog() {
  const value = useContext(LogContext)
  if (!value) throw new Error('useLog braucht einen LogContext')
  return value
}
