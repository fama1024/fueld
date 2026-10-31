import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/Button'
import LogRow from '@/components/LogRow'
import { getMealHistory } from '@/features/meals/mealApi'
import { getWorkoutHistory } from '@/features/workouts/workoutApi'
import { dateKeyOf, dateLabel } from '@/lib/date'
import { mealMeta, mealTitle, workoutMeta, workoutTitle } from './labels'
import { useLog, type LogEntry } from './LogContext'

const PAGE_SIZE = 60

function timestampOf(entry: LogEntry) {
  return entry.kind === 'meal' ? entry.meal.eatenAt : entry.workout.performedAt
}

function groupByDay(entries: LogEntry[]) {
  const groups = new Map<string, LogEntry[]>()
  for (const entry of entries) {
    const key = dateKeyOf(timestampOf(entry))
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.entries()]
}

export default function VerlaufPage() {
  const { version, openEntry } = useLog()
  const [entries, setEntries] = useState<LogEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    Promise.all([getMealHistory(), getWorkoutHistory()])
      .then(([meals, workouts]) => {
        const all: LogEntry[] = [
          ...meals.data.map(meal => ({ kind: 'meal', meal }) as const),
          ...workouts.data.map(workout => ({ kind: 'workout', workout }) as const),
        ]
        all.sort((a, b) => timestampOf(b).localeCompare(timestampOf(a)))
        setEntries(all)
      })
      .catch(() => setFailed(true))
  }, [version])

  const days = useMemo(() => groupByDay((entries ?? []).slice(0, visible)), [entries, visible])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-semibold text-ink">Verlauf</h1>

      {failed && <p className="text-caption text-danger">Das hat gerade nicht geklappt. Lade die Seite neu.</p>}
      {entries?.length === 0 && <p className="text-body text-ink-muted">Noch nichts eingetragen. Was gab’s heute?</p>}

      {days.map(([day, dayEntries]) => (
        <section key={day} aria-label={dateLabel(day)} className="flex flex-col gap-2">
          <h2 className="text-caption font-semibold text-ink-muted">{dateLabel(day)}</h2>
          {dayEntries.map(entry => entry.kind === 'meal' ? (
            <LogRow key={entry.meal.id} kind="meal" title={mealTitle(entry.meal)} meta={mealMeta(entry.meal)}
              rating={entry.meal.goalRating} onClick={() => openEntry(entry)} />
          ) : (
            <LogRow key={entry.workout.id} kind="workout" title={workoutTitle(entry.workout)} meta={workoutMeta(entry.workout)}
              onClick={() => openEntry(entry)} />
          ))}
        </section>
      ))}

      {entries && entries.length > visible && (
        <Button block variant="secondary" onClick={() => setVisible(v => v + PAGE_SIZE)}>Ältere Einträge laden</Button>
      )}
    </div>
  )
}
