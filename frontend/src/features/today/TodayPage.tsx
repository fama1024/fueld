import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FocusHint from '@/components/FocusHint'
import LogRow from '@/components/LogRow'
import MacroBar from '@/components/MacroBar'
import MetricTile from '@/components/MetricTile'
import QuickEntry from '@/components/QuickEntry'
import WeekBars from '@/components/WeekBars'
import AskBox from '@/features/assistant/AskBox'
import { getTodayWorkouts, getTodaySummary, type TodaySummary } from './todayApi'
import { mealMeta, mealTitle, mealTypeForNow, workoutMeta, workoutTitle } from '@/features/log/labels'
import { useLog } from '@/features/log/LogContext'
import { getMealTrend, logMeal, type DayTotal } from '@/features/meals/mealApi'
import { getGoals, type GoalsData } from '@/features/profile/profileApi'
import { getWorkoutHistory, type WorkoutLogResponse } from '@/features/workouts/workoutApi'
import { mondayOf, todayIso } from '@/lib/date'
import { filesToPhotoDtos } from '@/lib/photos'
import { buildFocus, buildWeek, proteinTendency } from './weekTendency'

const PHOTO_ONLY_TEXT = 'Mahlzeit auf dem Foto'

interface TodayData {
  summary: TodaySummary
  workouts: WorkoutLogResponse[]
  trend: DayTotal[]
  goals: GoalsData
  weekWorkouts: number
}

async function loadToday(): Promise<TodayData> {
  const [summary, workouts, trend, goals, history] = await Promise.all([
    getTodaySummary(), getTodayWorkouts(), getMealTrend(7), getGoals(), getWorkoutHistory(),
  ])
  const monday = mondayOf(new Date()).getTime()
  return {
    summary: summary.data,
    workouts: workouts.data,
    trend: trend.data,
    goals: goals.data,
    weekWorkouts: history.data.filter(w => new Date(w.performedAt).getTime() >= monday).length,
  }
}

function workoutCount(count: number) {
  if (count === 0) return 'noch keins'
  return count === 1 ? '1 Einheit' : `${count} Einheiten`
}

export default function TodayPage() {
  const { version, changed, openAdd, openEntry } = useLog()
  const [data, setData] = useState<TodayData | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadToday()
      .then(result => { setData(result); setFailed(false) })
      .catch(() => setFailed(true))
  }, [version])

  async function handleQuickEntry(text: string, files: File[]) {
    setSaving(true)
    try {
      const photos = files.length ? await filesToPhotoDtos(files) : undefined
      await logMeal({ text: text || PHOTO_ONLY_TEXT, photos, mealType: mealTypeForNow(), eatenAt: todayIso() })
      changed()
    } catch {
      openAdd(text || PHOTO_ONLY_TEXT)
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const week = data ? buildWeek(data.trend, data.goals) : []
  const inTarget = week.filter(day => day.inTarget).length
  const hasEntries = !!data && (data.summary.meals.length > 0 || data.workouts.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-caption text-ink-muted">{today}</p>
        {data && (
          <>
            <p className="mt-1 text-hero font-semibold tracking-[-0.02em] text-lime">{inTarget} von 7</p>
            <p className="text-body text-ink-soft">Tagen im Zielbereich</p>
          </>
        )}
      </header>

      <QuickEntry busy={saving} onSubmit={handleQuickEntry} />

      {failed && <p className="text-caption text-danger">Das hat gerade nicht geklappt. Lade die Seite neu.</p>}

      {data && (
        <>
          {!data.goals.hasEnoughData && (
            <Link to="/profile" className="rounded-md bg-surface-1 p-3 text-caption text-warning">
              Trag Gewicht, Größe und Alter im Profil ein, dann werden deine Tagesziele genauer.
            </Link>
          )}

          <WeekBars days={week} />

          <div className="grid grid-cols-2 gap-2">
            <MetricTile label="Protein" value={proteinTendency(data.trend, data.goals)} note="in den letzten Tagen" />
            <MetricTile label="Training" value={workoutCount(data.weekWorkouts)} note="diese Woche" />
          </div>

          <section aria-label="Tendenz heute" className="flex flex-col gap-2 rounded-lg bg-surface-1 p-4">
            <h2 className="mb-1 text-heading font-semibold text-ink">Tendenz heute</h2>
            <MacroBar macro="calories" bucket={data.summary.buckets.calories} />
            <MacroBar macro="protein" bucket={data.summary.buckets.protein} />
            <MacroBar macro="carbs" bucket={data.summary.buckets.carbs} />
            <MacroBar macro="fat" bucket={data.summary.buckets.fat} />
          </section>

          <FocusHint items={buildFocus(data.trend, data.goals)} />

          <section aria-label="Heute eingetragen" className="flex flex-col gap-2">
            <h2 className="mt-2 text-heading font-semibold text-ink">Heute eingetragen</h2>
            {!hasEntries && <p className="text-body text-ink-muted">Noch nichts eingetragen. Was gab’s heute?</p>}
            {data.summary.meals.map(meal => (
              <LogRow key={meal.id} kind="meal" title={mealTitle(meal)} meta={mealMeta(meal)} rating={meal.goalRating}
                onClick={() => openEntry({ kind: 'meal', meal })} />
            ))}
            {data.workouts.map(workout => (
              <LogRow key={workout.id} kind="workout" title={workoutTitle(workout)} meta={workoutMeta(workout)}
                onClick={() => openEntry({ kind: 'workout', workout })} />
            ))}
          </section>

          <AskBox />
        </>
      )}
    </div>
  )
}
