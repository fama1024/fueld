import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/Button'
import LoadFailed from '@/components/LoadFailed'
import LogRow from '@/components/LogRow'
import MetricTile from '@/components/MetricTile'
import GarminCard from '@/features/garmin/GarminCard'
import { WORKOUT_TYPES, workoutMeta, workoutTitle } from '@/features/log/labels'
import { useLog } from '@/features/log/LogContext'
import { formatDistance, formatDuration, groupByDay, workoutPeriods, workoutsByType, type WorkoutPeriod } from '@/features/log/stats'
import { getWorkoutHistory, type WorkoutLogResponse } from '@/features/workouts/workoutApi'
import { dateLabel } from '@/lib/date'

const PAGE_SIZE = 30

/** Bewusst neutral: zeigt den Vorzeitraum, ohne ihn als besser oder schlechter einzuordnen. */
function previousLabel(previous: WorkoutPeriod) {
  if (previous.count === 0) return 'Die 7 Tage davor: kein Training'
  const parts = [previous.count === 1 ? '1 Einheit' : `${previous.count} Einheiten`]
  if (previous.distanceKm > 0) parts.push(formatDistance(previous.distanceKm))
  return `Die 7 Tage davor: ${parts.join(', ')}`
}

export default function SportPage() {
  const { version, openEntry } = useLog()
  const [workouts, setWorkouts] = useState<WorkoutLogResponse[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    getWorkoutHistory()
      .then(res => { setWorkouts(res.data); setFailed(false) })
      .catch(() => setFailed(true))
  }, [version, attempt])

  const periods = useMemo(() => workoutPeriods(workouts ?? []), [workouts])
  const byType = useMemo(() => workoutsByType(periods.recent), [periods])
  const days = useMemo(() => groupByDay((workouts ?? []).slice(0, visible), w => w.performedAt), [workouts, visible])
  const maxCount = Math.max(1, ...byType.map(entry => entry.count))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-semibold text-ink">Sport</h1>

      <GarminCard />

      {failed && <LoadFailed onRetry={() => setAttempt(a => a + 1)} />}
      {!workouts && !failed && <p className="text-body text-ink-muted">Lade deine Trainings…</p>}

      {workouts && (
        <>
          <section aria-label="Letzte 7 Tage" className="flex flex-col gap-2">
            <h2 className="text-heading font-semibold text-ink">Letzte 7 Tage</h2>
            <div className="grid grid-cols-3 gap-2">
              <MetricTile label="Einheiten" value={periods.current.count} />
              <MetricTile label="Zeit" value={formatDuration(periods.current.minutes)} />
              <MetricTile label="Distanz" value={formatDistance(periods.current.distanceKm)} />
            </div>
            <p className="text-caption text-ink-muted">{previousLabel(periods.previous)}</p>
          </section>

          {byType.length > 0 && (
            <section aria-label="Nach Sportart" className="flex flex-col gap-2">
              <h2 className="text-caption font-semibold text-ink-muted">Nach Sportart</h2>
              {byType.map(({ type, count }) => (
                <div key={type} className="grid grid-cols-[84px_1fr_24px] items-center gap-3 text-caption text-ink-soft">
                  <span>{WORKOUT_TYPES.find(option => option.value === type)?.label ?? type}</span>
                  <div className="h-2.5 rounded-xs bg-surface-1">
                    <div className="h-full rounded-xs bg-lime" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-right font-semibold text-ink">{count}</span>
                </div>
              ))}
            </section>
          )}

          {workouts.length === 0 && <p className="text-body text-ink-muted">Noch kein Training eingetragen.</p>}

          {days.map(([day, dayWorkouts]) => (
            <section key={day} aria-label={dateLabel(day)} className="flex flex-col gap-2">
              <h2 className="text-caption font-semibold text-ink-muted">{dateLabel(day)}</h2>
              {dayWorkouts.map(workout => (
                <LogRow key={workout.id} kind="workout" title={workoutTitle(workout)} meta={workoutMeta(workout)}
                  onClick={() => openEntry({ kind: 'workout', workout })} />
              ))}
            </section>
          ))}

          {workouts.length > visible && (
            <Button block variant="secondary" onClick={() => setVisible(v => v + PAGE_SIZE)}>Ältere Trainings laden</Button>
          )}
        </>
      )}
    </div>
  )
}
