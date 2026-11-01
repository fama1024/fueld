import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FocusHint from '@/components/FocusHint'
import LoadFailed from '@/components/LoadFailed'
import LogRow from '@/components/LogRow'
import MacroGrid from '@/components/MacroGrid'
import QuickEntry from '@/components/QuickEntry'
import AskBox from '@/features/assistant/AskBox'
import { getFocus, getTodayWorkouts, getTodaySummary, type FocusData, type TodaySummary } from './todayApi'
import ClarifySheet from '@/features/log/ClarifySheet'
import { confirmEntries, parseEntry, type EntryDraft } from '@/features/log/entryApi'
import { mealMeta, mealTitle, workoutMeta, workoutTitle } from '@/features/log/labels'
import { useLog } from '@/features/log/LogContext'
import { getMealTrend, type DayTotal } from '@/features/meals/mealApi'
import { getGoals, type GoalsData } from '@/features/profile/profileApi'
import { getWorkoutHistory, type WorkoutLogResponse } from '@/features/workouts/workoutApi'
import { localDateKey } from '@/lib/date'
import { filesToPhotoDtos } from '@/lib/photos'
import { buildFocus, buildMacroGrid, daysInTarget } from './weekTendency'

interface TodayData {
  summary: TodaySummary
  workouts: WorkoutLogResponse[]
  trend: DayTotal[]
  goals: GoalsData
  recentWorkouts: number
}

async function loadToday(): Promise<TodayData> {
  const start = new Date()
  start.setDate(start.getDate() - 6)
  const [summary, workouts, trend, goals, recent] = await Promise.all([
    getTodaySummary(), getTodayWorkouts(), getMealTrend(7), getGoals(), getWorkoutHistory(localDateKey(start)),
  ])
  return {
    summary: summary.data,
    workouts: workouts.data,
    trend: trend.data,
    goals: goals.data,
    recentWorkouts: recent.data.length,
  }
}

function savedLabel(meals: number, workouts: number) {
  const parts = []
  if (meals > 0) parts.push(meals === 1 ? '1 Mahlzeit' : `${meals} Mahlzeiten`)
  if (workouts > 0) parts.push(workouts === 1 ? '1 Training' : `${workouts} Trainings`)
  return parts.join(' und ')
}

function focusSubtitle(focus: FocusData | null) {
  const parts = []
  if (focus?.goal) parts.push(`Ziel: ${focus.goal}`)
  if (focus?.diet) parts.push(`Ernährung: ${focus.diet}`)
  return parts.join(' · ') || undefined
}

function workoutLabel(count: number) {
  if (count === 0) return 'noch kein Training'
  return count === 1 ? '1 Training' : `${count} Trainings`
}

export default function TodayPage() {
  const { version, changed, openEntry } = useLog()
  const [data, setData] = useState<TodayData | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [drafts, setDrafts] = useState<EntryDraft[] | null>(null)
  const [entryKey, setEntryKey] = useState(0)
  const [notice, setNotice] = useState('')
  const [focus, setFocus] = useState<FocusData | null>(null)
  const [focusLoading, setFocusLoading] = useState(true)

  useEffect(() => {
    loadToday()
      .then(result => { setData(result); setFailed(false) })
      .catch(() => setFailed(true))
  }, [version, attempt])

  // Getrennt vom Rest: Der erste Abruf des Tages dauert wegen der KI länger und soll
  // den Screen nicht blockieren. Danach kommt der Fokus aus dem Tagesspeicher.
  useEffect(() => {
    getFocus()
      .then(res => setFocus(res.data))
      .catch(() => setFocus(null))
      .finally(() => setFocusLoading(false))
  }, [])

  async function saveEntries(items: EntryDraft[]) {
    const { data: saved } = await confirmEntries(items)
    setDrafts(null)
    setEntryKey(key => key + 1)
    setNotice(`${savedLabel(saved.meals, saved.workouts)} eingetragen.`)
    changed()
  }

  async function handleQuickEntry(text: string, files: File[]) {
    setSaving(true)
    setNotice('')
    try {
      const photos = files.length ? await filesToPhotoDtos(files) : undefined
      const { data } = await parseEntry(text, photos)
      if (data.items.length === 0) {
        setNotice(data.message || 'Das konnte ich nicht zuordnen. Beschreib es etwas genauer.')
      } else if (data.items.some(item => item.kind === 'meal' && !item.mealType)) {
        setDrafts(data.items)
      } else {
        await saveEntries(data.items)
      }
    } catch {
      // Text und Foto bleiben im Feld. Ein Formular wäre hier falsch: Es würde einen
      // ganzen Tag als eine einzige Mahlzeit speichern.
      setNotice('Das hat gerade nicht geklappt. Dein Text bleibt stehen, versuch es gleich nochmal.')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const grid = data ? buildMacroGrid(data.trend, data.goals) : null
  const hasEntries = !!data && (data.summary.meals.length > 0 || data.workouts.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-caption text-ink-muted">{today}</p>
        {data && (
          <>
            <p className="mt-1 text-hero font-semibold tracking-[-0.02em] text-lime">{daysInTarget(data.trend, data.goals)} von 7</p>
            <p className="text-body text-ink-soft">Tagen im Zielbereich · {workoutLabel(data.recentWorkouts)}</p>
          </>
        )}
      </header>

      <div className="flex flex-col gap-2">
        <QuickEntry key={entryKey} busy={saving} onSubmit={handleQuickEntry} />
        <p aria-live="polite" className="text-caption text-ink-muted">
          {saving ? 'Wird eingeordnet…' : notice || 'Auch ganze Tage oder Sport, zum Beispiel: Müsli, mittags Curry, 5 km gelaufen.'}
        </p>
      </div>
      {drafts && <ClarifySheet drafts={drafts} onSave={saveEntries} onClose={() => setDrafts(null)} />}

      {failed && <LoadFailed onRetry={() => setAttempt(a => a + 1)} />}
      {!data && !failed && <p className="text-body text-ink-muted">Lade deine Woche…</p>}

      {data && grid && (
        <>
          {!data.goals.hasEnoughData && (
            <Link to="/profile" className="rounded-md bg-surface-1 p-3 text-caption text-warning">
              Trag Gewicht, Größe und Alter im Profil ein, dann werden deine Tagesziele genauer.
            </Link>
          )}

          <MacroGrid days={grid.days} rows={grid.rows} />

          <FocusHint
            items={focus?.items.length ? focus.items : buildFocus(data.trend, data.goals)}
            subtitle={focusSubtitle(focus)}
            loading={focusLoading}
          />

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
