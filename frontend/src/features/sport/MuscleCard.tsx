import BodyFigure from '@/components/BodyFigure'
import type { WorkoutLogResponse } from '@/features/workouts/workoutApi'
import { BENEFITS, describeLoads, muscleLoadsFor } from './muscles'

/** "Wofür es gut war" und die Muskelgrafik eines Trainings. Zeigt nichts, wenn es nichts Ehrliches zu sagen gibt. */
export default function MuscleCard({ workout }: { workout: WorkoutLogResponse }) {
  const benefit = BENEFITS[workout.type]
  const muscles = muscleLoadsFor(workout)
  if (!benefit && !muscles) return null

  const described = muscles ? describeLoads(muscles.loads) : null
  const needsRefinement = muscles && !muscles.fromAi && workout.type !== 'running' && workout.type !== 'cycling'

  return (
    <section aria-label="Wofür es gut war" className="flex flex-col gap-3 rounded-md bg-surface-1 p-3">
      {benefit && (
        <div>
          <h3 className="text-label font-medium text-ink-muted">Wofür es gut war</h3>
          <p className="mt-1 text-body text-ink-soft">{benefit}</p>
        </div>
      )}
      {muscles && described && (
        <>
          <BodyFigure loads={muscles.loads} />
          <div className="flex flex-col gap-1 text-caption text-ink-soft">
            {described.wholeBody ? (
              <p>Ganzkörper</p>
            ) : (
              <>
                {described.primary.length > 0 && <p><span className="font-semibold text-ink">Hauptsächlich:</span> {described.primary.join(', ')}</p>}
                {described.secondary.length > 0 && <p><span className="font-semibold text-ink">Zusätzlich:</span> {described.secondary.join(', ')}</p>}
              </>
            )}
            <p className="text-ink-muted">
              Grobe Einschätzung.
              {needsRefinement && ' „Einordnung starten“ oder „Neu einordnen“ passt sie an dein Training an.'}
            </p>
          </div>
        </>
      )}
    </section>
  )
}
