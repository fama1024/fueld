import type { WorkoutLogResponse, WorkoutType } from '@/features/workouts/workoutApi'

export type MuscleGroup = 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'core' | 'back' | 'glutes' | 'quads' | 'hamstrings' | 'calves'
export type MuscleLevel = 'primary' | 'secondary'

export interface MuscleLoad {
  group: MuscleGroup
  level: MuscleLevel
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Brust',
  shoulders: 'Schultern',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  core: 'Bauch',
  back: 'Rücken',
  glutes: 'Gesäß',
  quads: 'Oberschenkel vorne',
  hamstrings: 'Oberschenkel hinten',
  calves: 'Waden',
}

const ALL_GROUPS = Object.keys(MUSCLE_LABELS) as MuscleGroup[]

function loads(primary: MuscleGroup[], secondary: MuscleGroup[]): MuscleLoad[] {
  return [
    ...primary.map(group => ({ group, level: 'primary' as const })),
    ...secondary.map(group => ({ group, level: 'secondary' as const })),
  ]
}

/** Feste Gruppen pro Sportart, solange die KI keine genauere Einschätzung geliefert hat. */
const TYPICAL: Partial<Record<WorkoutType, MuscleLoad[]>> = {
  running: loads(['quads', 'hamstrings', 'calves'], ['glutes', 'core']),
  cycling: loads(['quads', 'glutes'], ['calves', 'hamstrings', 'core']),
  // Ohne Angaben zu den Übungen ist "Ganzkörper" die ehrliche Antwort
  crossfit: loads([], ALL_GROUPS),
}

export const BENEFITS: Partial<Record<WorkoutType, string>> = {
  running: 'Grundlagenausdauer, Herz-Kreislauf-System und Beinmuskulatur.',
  cycling: 'Ausdauer und Kraft in Oberschenkeln und Gesäß, schonend für die Gelenke.',
  crossfit: 'Kraft, Ausdauer und Beweglichkeit im ganzen Körper.',
}

/** Bei "Sonstiges" ohne KI-Einschätzung gibt es nichts Ehrliches zu zeigen, dann liefert das null. */
export function muscleLoadsFor(workout: Pick<WorkoutLogResponse, 'type' | 'muscleGroups'>) {
  if (workout.muscleGroups && workout.muscleGroups.length > 0) return { loads: workout.muscleGroups, fromAi: true }
  const typical = TYPICAL[workout.type]
  return typical ? { loads: typical, fromAi: false } : null
}

export function describeLoads(loadList: MuscleLoad[]) {
  const names = (level: MuscleLevel) => loadList.filter(load => load.level === level).map(load => MUSCLE_LABELS[load.group])
  const primary = names('primary')
  return {
    primary,
    secondary: names('secondary'),
    wholeBody: primary.length === 0 && loadList.length === ALL_GROUPS.length,
  }
}
