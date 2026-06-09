import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTodaySummary, getWeeklySummary, getTodayWorkouts, type TodaySummary, type WeekSummary } from './dashboardApi'
import { getGoals, type GoalsData } from '@/features/profile/profileApi'
import type { WorkoutLogResponse } from '@/features/workouts/workoutApi'
import RingChart from '@/components/RingChart'

interface NutrientRow {
  label: string
  unit: string
  value: number
  goal: number
  color: string
}

function NutrientStatus({ value, goal, unit }: { value: number; goal: number; unit: string }) {
  if (goal === 0) return null
  const ratio = value / goal
  const remaining = Math.round(goal - value)

  if (ratio > 1.1) {
    const over = Math.round(value - goal)
    return (
      <span className="text-xs font-medium text-orange-500">
        +{over}{unit} über Ziel
      </span>
    )
  }
  if (ratio >= 0.9) {
    return <span className="text-xs font-medium text-green-600">Gut erreicht</span>
  }
  if (ratio >= 0.7) {
    return <span className="text-xs font-medium text-yellow-600">Noch {remaining}{unit}</span>
  }
  return <span className="text-xs font-medium text-red-500">Fehlt noch {remaining}{unit}</span>
}

function NutrientAnalysis({
  rows,
}: {
  rows: NutrientRow[]
}) {
  return (
    <div className="divide-y divide-neutral-100">
      {rows.map(row => {
        const ratio = row.goal > 0 ? Math.min(row.value / row.goal, 1) : 0
        return (
          <div key={row.label} className="py-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-sm text-neutral-700 flex-1 min-w-0">{row.label}</span>
              <NutrientStatus value={row.value} goal={row.goal} unit={row.unit} />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${ratio * 100}%`, backgroundColor: row.color }}
                />
              </div>
              <span className="text-xs text-neutral-400 w-16 text-right shrink-0">
                {row.value}/{row.goal}{row.unit}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const WORKOUT_LABELS: Record<string, string> = {
  running: 'Laufen',
  crossfit: 'CrossFit',
  cycling: 'Radfahren',
  other: 'Sonstiges',
}

const RING_COLORS = {
  calories: '#16A34A',
  protein:  '#3B82F6',
  carbs:    '#F59E0B',
  fat:      '#F97316',
}

function weekRangeLabel() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  return `Mo ${fmt(monday)} – So ${fmt(sunday)}`
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutLogResponse[]>([])
  const [goals, setGoals] = useState<GoalsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisTab, setAnalysisTab] = useState<'today' | 'week'>('today')

  useEffect(() => {
    Promise.all([getTodaySummary(), getWeeklySummary(), getTodayWorkouts(), getGoals()])
      .then(([meals, week, w, g]) => {
        setSummary(meals.data)
        setWeekSummary(week.data)
        setWorkouts(w.data)
        setGoals(g.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const hasAnything = (summary?.meals.length ?? 0) > 0 || workouts.length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4 px-4">
      <div>
        <p className="text-xs text-neutral-400 uppercase tracking-wide">{today}</p>
        <h1 className="text-2xl font-bold text-neutral-900 mt-0.5">Übersicht</h1>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400">Lade…</div>
      ) : (
        <>
          {/* Ziele-Hinweis wenn Profil unvollständig */}
          {goals && !goals.hasEnoughData && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              <Link to="/profile" className="hover:underline font-medium">
                Gewicht, Größe und Alter im Profil eintragen
              </Link>
              {' '}für präzise Tagesziele. Aktuell werden Standardwerte verwendet.
            </div>
          )}

          {/* Tages-Ringdiagramme */}
          {summary && goals && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">Heute</h2>
                <p className="text-xs text-neutral-400">{summary.totalCalories} kcal gegessen</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <RingChart value={summary.totalCalories} goal={goals.calories}
                  color={RING_COLORS.calories} label="kcal" unit="" />
                <RingChart value={summary.totalProtein} goal={goals.protein}
                  color={RING_COLORS.protein} label="Protein" unit="g" />
                <RingChart value={summary.totalCarbs} goal={goals.carbs}
                  color={RING_COLORS.carbs} label="Kohlenhydr." unit="g" />
                <RingChart value={summary.totalFat} goal={goals.fat}
                  color={RING_COLORS.fat} label="Fett" unit="g" />
              </div>
            </div>
          )}

          {/* Wochen-Ringdiagramme */}
          {weekSummary && goals && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800">Diese Woche</h2>
                <p className="text-xs text-neutral-400">{weekRangeLabel()}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <RingChart value={weekSummary.totalCalories} goal={goals.calories * 7}
                  color={RING_COLORS.calories} label="kcal" unit="" />
                <RingChart value={weekSummary.totalProtein} goal={goals.protein * 7}
                  color={RING_COLORS.protein} label="Protein" unit="g" />
                <RingChart value={weekSummary.totalCarbs} goal={goals.carbs * 7}
                  color={RING_COLORS.carbs} label="Kohlenhydr." unit="g" />
                <RingChart value={weekSummary.totalFat} goal={goals.fat * 7}
                  color={RING_COLORS.fat} label="Fett" unit="g" />
              </div>
            </div>
          )}

          {/* Nährwert-Analyse */}
          {summary && weekSummary && goals && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-800">Nährwert-Analyse</h2>
                <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setAnalysisTab('today')}
                    className={`px-3 py-1.5 transition-colors ${
                      analysisTab === 'today'
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-500 hover:bg-neutral-50'
                    }`}
                  >
                    Heute
                  </button>
                  <button
                    onClick={() => setAnalysisTab('week')}
                    className={`px-3 py-1.5 transition-colors ${
                      analysisTab === 'week'
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-500 hover:bg-neutral-50'
                    }`}
                  >
                    Woche
                  </button>
                </div>
              </div>

              {analysisTab === 'today' ? (
                <NutrientAnalysis
                  rows={[
                    { label: 'Kalorien', unit: ' kcal', value: summary.totalCalories, goal: goals.calories, color: RING_COLORS.calories },
                    { label: 'Protein', unit: 'g', value: summary.totalProtein, goal: goals.protein, color: RING_COLORS.protein },
                    { label: 'Kohlenhydrate', unit: 'g', value: summary.totalCarbs, goal: goals.carbs, color: RING_COLORS.carbs },
                    { label: 'Fett', unit: 'g', value: summary.totalFat, goal: goals.fat, color: RING_COLORS.fat },
                  ]}
                />
              ) : (
                <NutrientAnalysis
                  rows={[
                    { label: 'Kalorien', unit: ' kcal', value: weekSummary.totalCalories, goal: goals.calories * 7, color: RING_COLORS.calories },
                    { label: 'Protein', unit: 'g', value: weekSummary.totalProtein, goal: goals.protein * 7, color: RING_COLORS.protein },
                    { label: 'Kohlenhydrate', unit: 'g', value: weekSummary.totalCarbs, goal: goals.carbs * 7, color: RING_COLORS.carbs },
                    { label: 'Fett', unit: 'g', value: weekSummary.totalFat, goal: goals.fat * 7, color: RING_COLORS.fat },
                  ]}
                />
              )}
            </div>
          )}

          {hasAnything ? (
            <>
              {/* Heutige Mahlzeiten */}
              {(summary?.meals.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                    Mahlzeiten heute
                  </h2>
                  <div className="space-y-2">
                    {summary!.meals.map(meal => (
                      <div key={meal.id}
                        className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">{meal.textInput}</p>
                          {meal.summary && (
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">{meal.summary}</p>
                          )}
                        </div>
                        {meal.calories != null && (
                          <span className="text-sm font-semibold text-neutral-500 shrink-0 ml-4">
                            {meal.calories} kcal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Heutige Trainings */}
              {workouts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                    Training heute
                  </h2>
                  <div className="space-y-2">
                    {workouts.map(w => (
                      <div key={w.id}
                        className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800">
                            {WORKOUT_LABELS[w.type] ?? w.type}
                            {w.durationMinutes ? ` · ${w.durationMinutes} min` : ''}
                          </p>
                          {w.summary && (
                            <p className="text-xs text-neutral-400 mt-0.5 truncate">{w.summary}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4 text-sm font-semibold text-neutral-500">
                          {w.distanceKm != null && <span>{w.distanceKm} km</span>}
                          {w.caloriesBurned != null && <span>{w.caloriesBurned} kcal</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 space-y-2">
              <p className="text-neutral-400 text-sm">Heute noch nichts geloggt.</p>
              <Link to="/log"
                className="inline-block text-sm font-medium text-[#16A34A] hover:underline">
                Ersten Eintrag erstellen →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
