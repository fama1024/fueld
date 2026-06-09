import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, Dumbbell, Activity, TrendingUp, ChevronRight } from 'lucide-react'
import { getTodaySummary, getWeeklySummary, getTodayWorkouts, type TodaySummary, type WeekSummary } from './dashboardApi'
import { getGoals, type GoalsData } from '@/features/profile/profileApi'
import type { WorkoutLogResponse } from '@/features/workouts/workoutApi'
import { getInsightHistory } from '@/features/insights/insightApi'

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: '#16A34A',
  lunch: '#3B82F6',
  dinner: '#F97316',
  snack: '#EAB308',
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
}

const WORKOUT_EMOJIS: Record<string, string> = {
  running: '🏃',
  crossfit: '🏋️',
  cycling: '🚴',
  other: '💪',
}

function BigRing({ value, max, color, size = 110, strokeWidth = 10 }: {
  value: number; max: number; color: string; size?: number; strokeWidth?: number
}) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const progress = max > 0 ? Math.min(value / max, 1) : 0
  const cx = size / 2
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e8f0eb" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111816', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: '#5a6b5e' }}>/ {max} kcal</div>
      </div>
    </div>
  )
}

function MiniRing({ value, max, color, label, unit, size = 72, strokeWidth = 7 }: {
  value: number; max: number; color: string; label: string; unit: string; size?: number; strokeWidth?: number
}) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const progress = max > 0 ? Math.min(value / max, 1) : 0
  const cx = size / 2
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e8f0eb" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="text-center" style={{ marginTop: -2 }}>
        <div style={{ fontSize: 11, color: '#5a6b5e', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#111816', fontWeight: 600 }}>
          {value}<span style={{ fontSize: 10, fontWeight: 400 }}>{unit}</span>
        </div>
      </div>
    </div>
  )
}


export default function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutLogResponse[]>([])
  const [goals, setGoals] = useState<GoalsData | null>(null)
  const [dailyInsight, setDailyInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'heute' | 'woche'>('heute')

  useEffect(() => {
    Promise.all([
      getTodaySummary(),
      getWeeklySummary(),
      getTodayWorkouts(),
      getGoals(),
      getInsightHistory('daily').catch(() => null),
    ]).then(([meals, week, w, g, insights]) => {
      setSummary(meals.data)
      setWeekSummary(week.data)
      setWorkouts(w.data)
      setGoals(g.data)
      if (insights?.data?.[0]?.content) {
        const text = insights.data[0].content
        const preview = text.split('\n').find((l: string) => l.trim().length > 20) ?? text.slice(0, 120)
        setDailyInsight(preview.replace(/\*\*/g, '').slice(0, 120))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const cal = tab === 'heute'
    ? { value: summary?.totalCalories ?? 0, max: goals?.calories ?? 2000 }
    : { value: weekSummary?.totalCalories ?? 0, max: (goals?.calories ?? 2000) * 7 }
  const pro = tab === 'heute'
    ? { value: summary?.totalProtein ?? 0, max: goals?.protein ?? 150 }
    : { value: weekSummary?.totalProtein ?? 0, max: (goals?.protein ?? 150) * 7 }
  const carb = tab === 'heute'
    ? { value: summary?.totalCarbs ?? 0, max: goals?.carbs ?? 250 }
    : { value: weekSummary?.totalCarbs ?? 0, max: (goals?.carbs ?? 250) * 7 }
  const fat = tab === 'heute'
    ? { value: summary?.totalFat ?? 0, max: goals?.fat ?? 70 }
    : { value: weekSummary?.totalFat ?? 0, max: (goals?.fat ?? 70) * 7 }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="px-4 pt-5">
        <p style={{ fontSize: 13, color: '#5a6b5e' }}>{today}</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111816', lineHeight: 1.2 }}>Übersicht</h1>
      </div>

      {loading ? (
        <div className="px-4 text-sm" style={{ color: '#5a6b5e' }}>Lade…</div>
      ) : (
        <>
          {/* Quick actions */}
          <div className="px-4 flex gap-3">
            <button onClick={() => navigate('/log')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white"
              style={{ background: '#16A34A', fontSize: 14, fontWeight: 600 }}>
              <Flame size={16} />
              Mahlzeit loggen
            </button>
            <button onClick={() => navigate('/log')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl"
              style={{ background: '#eef1ee', color: '#111816', fontSize: 14, fontWeight: 600 }}>
              <Dumbbell size={16} />
              Training loggen
            </button>
          </div>

          {/* Goals hint */}
          {goals && !goals.hasEnoughData && (
            <div className="mx-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#fff8e1', border: '1px solid #fde68a', color: '#92400e' }}>
              <Link to="/profile" className="font-medium hover:underline">
                Gewicht, Größe und Alter im Profil eintragen
              </Link>
              {' '}für präzise Tagesziele.
            </div>
          )}

          {/* Nährstoffe card */}
          <div className="mx-4 bg-white rounded-2xl p-4" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111816' }}>Nährstoffe</h2>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #eef1ee' }}>
                {(['heute', 'woche'] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 12px',
                    background: tab === t ? '#16A34A' : 'transparent',
                    color: tab === t ? '#fff' : '#5a6b5e',
                    transition: 'all 0.2s',
                  }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <BigRing value={cal.value} max={cal.max} color="#16A34A" size={90} strokeWidth={9} />
              <div className="flex gap-2 flex-1 justify-around">
                <MiniRing value={pro.value} max={pro.max} color="#3B82F6" label="Protein" unit="g" size={60} strokeWidth={6} />
                <MiniRing value={carb.value} max={carb.max} color="#EAB308" label="Carbs" unit="g" size={60} strokeWidth={6} />
                <MiniRing value={fat.value} max={fat.max} color="#F97316" label="Fett" unit="g" size={60} strokeWidth={6} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {[
                { label: 'Kalorien', pct: cal.max > 0 ? cal.value / cal.max : 0, color: '#16A34A' },
                { label: 'Protein', pct: pro.max > 0 ? pro.value / pro.max : 0, color: '#3B82F6' },
                { label: 'Carbs', pct: carb.max > 0 ? carb.value / carb.max : 0, color: '#EAB308' },
                { label: 'Fett', pct: fat.max > 0 ? fat.value / fat.max : 0, color: '#F97316' },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex-1">
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: '#eef1ee' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct * 100, 100)}%`, background: color, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#5a6b5e', marginTop: 3, textAlign: 'center' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's meals */}
          {(summary?.meals.length ?? 0) > 0 && (
            <div className="px-4">
              <div className="flex justify-between items-center mb-3">
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111816' }}>Mahlzeiten heute</h2>
                <span style={{ fontSize: 12, color: '#5a6b5e' }}>{summary!.meals.length} Einträge</span>
              </div>
              <div className="flex flex-col gap-2">
                {summary!.meals.map(meal => {
                  const color = MEAL_TYPE_COLORS[meal.mealType ?? ''] ?? '#16A34A'
                  const typeLabel = MEAL_TYPE_LABELS[meal.mealType ?? ''] ?? ''
                  const time = meal.eatenAt
                    ? new Date(meal.eatenAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    : ''
                  return (
                    <div key={meal.id} className="bg-white rounded-xl p-3"
                      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ width: 36, height: 36, background: color + '18' }}>
                            <div className="rounded-full" style={{ width: 8, height: 8, background: color }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              {typeLabel && <span style={{ fontSize: 11, fontWeight: 600, color }}>{typeLabel}</span>}
                              {time && <span style={{ fontSize: 11, color: '#a0b0a5' }}>· {time}</span>}
                            </div>
                            <p className="truncate" style={{ fontSize: 13, color: '#111816', lineHeight: 1.3 }}>
                              {meal.summary || meal.textInput}
                            </p>
                          </div>
                        </div>
                        {meal.calories != null && (
                          <div className="text-right flex-shrink-0">
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>{meal.calories}</div>
                            <div style={{ fontSize: 10, color: '#5a6b5e' }}>kcal</div>
                          </div>
                        )}
                      </div>
                      {(meal.protein != null || meal.carbs != null || meal.fat != null) && (
                        <div className="flex gap-3 mt-2" style={{ paddingLeft: 44 }}>
                          {meal.protein != null && <span style={{ fontSize: 11, color: '#5a6b5e' }}><span style={{ color: '#3B82F6', fontWeight: 600 }}>P</span> {meal.protein}g</span>}
                          {meal.carbs != null && <span style={{ fontSize: 11, color: '#5a6b5e' }}><span style={{ color: '#EAB308', fontWeight: 600 }}>C</span> {meal.carbs}g</span>}
                          {meal.fat != null && <span style={{ fontSize: 11, color: '#5a6b5e' }}><span style={{ color: '#F97316', fontWeight: 600 }}>F</span> {meal.fat}g</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Today's workouts */}
          {workouts.length > 0 && (
            <div className="px-4">
              <h2 className="mb-3" style={{ fontSize: 16, fontWeight: 700, color: '#111816' }}>Training heute</h2>
              <div className="flex flex-col gap-2">
                {workouts.map(w => (
                  <div key={w.id} className="bg-white rounded-xl p-3"
                    style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ width: 40, height: 40, background: '#dcfce7' }}>
                          {WORKOUT_EMOJIS[w.type] ?? '💪'}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111816' }}>
                            {w.type === 'running' ? 'Laufen' : w.type === 'crossfit' ? 'CrossFit' : w.type === 'cycling' ? 'Radfahren' : 'Training'}
                          </div>
                          <div style={{ fontSize: 12, color: '#5a6b5e' }}>
                            {w.durationMinutes ? `${w.durationMinutes} min` : ''}
                            {w.durationMinutes && w.caloriesBurned ? ' · ' : ''}
                            {w.caloriesBurned ? `${w.caloriesBurned} kcal` : ''}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#a0b0a5" />
                    </div>
                    {w.summary && (
                      <p className="mt-2 truncate" style={{ fontSize: 12, color: '#5a6b5e', paddingLeft: 52 }}>{w.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {(summary?.meals.length ?? 0) === 0 && workouts.length === 0 && (
            <div className="text-center py-10 space-y-2 px-4">
              <p style={{ color: '#5a6b5e', fontSize: 14 }}>Heute noch nichts geloggt.</p>
              <Link to="/log" className="inline-block text-sm font-medium hover:underline" style={{ color: '#16A34A' }}>
                Ersten Eintrag erstellen →
              </Link>
            </div>
          )}

          {/* KI-Insight teaser */}
          {dailyInsight && (
            <Link to="/insights" className="mx-4 rounded-2xl p-4 block"
              style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803d 100%)' }}>
              <div className="flex items-start gap-3">
                <TrendingUp size={20} color="rgba(255,255,255,0.9)" className="flex-shrink-0 mt-0.5" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>KI-Insight heute</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 1.5 }}>
                    {dailyInsight}…
                  </p>
                </div>
                <Activity size={16} color="rgba(255,255,255,0.6)" className="flex-shrink-0 mt-0.5 ml-auto" />
              </div>
            </Link>
          )}
        </>
      )}
    </div>
  )
}
