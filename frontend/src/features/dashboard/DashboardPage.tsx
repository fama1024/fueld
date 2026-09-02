import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, Dumbbell, Activity, TrendingUp, ChevronRight } from 'lucide-react'
import { getTodaySummary, getWeeklySummary, getTodayWorkouts, type TodaySummary, type WeekSummary } from './dashboardApi'
import { getGoals, getProfile, type GoalsData } from '@/features/profile/profileApi'
import type { WorkoutLogResponse } from '@/features/workouts/workoutApi'
import { getInsightHistory } from '@/features/insights/insightApi'

function greeting() {
  const h = new Date().getHours()
  if (h >= 4  && h < 11) return 'Guten Morgen'
  if (h >= 11 && h < 14) return 'Guten Mittag'
  if (h >= 14 && h < 17) return 'Guten Nachmittag'
  if (h >= 17 && h < 22) return 'Guten Abend'
  return 'Gute Nacht'
}

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

const RING_CONFIG = [
  { key: 'cal',  color: '#16A34A', label: 'Kalorien', unit: 'kcal' },
  { key: 'pro',  color: '#3B82F6', label: 'Protein',  unit: 'g'    },
  { key: 'carb', color: '#EAB308', label: 'Carbs',    unit: 'g'    },
  { key: 'fat',  color: '#F97316', label: 'Fett',     unit: 'g'    },
] as const

type RingKey = (typeof RING_CONFIG)[number]['key']
type RingData = { bucket: number; value: number; max: number }

/**
 * Tendenz-Ringe: Füllstand kommt gerastet vom Server (0/25/50/75/100 %),
 * keine exakten Zahlen in der Standardansicht. Tap auf den Ring blendet
 * die zugrundeliegenden Werte für Ausnahmefälle ein.
 */
function ConcentricRings({ cal, pro, carb, fat }: Record<RingKey, RingData>) {
  const [showDetail, setShowDetail] = useState(false)
  const size = 168
  const sw = 9        // strokeWidth
  const gap = 5       // gap between rings
  const cx = size / 2
  const data = { cal, pro, carb, fat }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="relative"
        style={{ width: size, height: size }}
        aria-label={showDetail ? 'Detailwerte ausblenden' : 'Detailwerte einblenden'}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {RING_CONFIG.map(({ key, color }, i) => {
            const r = cx - sw / 2 - i * (sw + gap)
            const circumference = 2 * Math.PI * r
            const progress = Math.min(Math.max(data[key].bucket, 0), 100) / 100
            return (
              <g key={key}>
                <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e8f0eb" strokeWidth={sw} />
                <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </g>
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showDetail ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111816', lineHeight: 1 }}>{cal.value}</div>
              <div style={{ fontSize: 9, color: '#5a6b5e', marginTop: 2 }}>/ {cal.max} kcal</div>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#5a6b5e' }}>Kalorien</span>
          )}
        </div>
      </button>

      {/* Legende: Makros */}
      <div className="flex gap-4">
        {RING_CONFIG.slice(1).map(({ key, color, label, unit }) => {
          const d = data[key]
          return (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <div className="rounded-full" style={{ width: 7, height: 7, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#5a6b5e' }}>{label}</span>
              </div>
              {showDetail && (
                <>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111816' }}>
                    {d.value}<span style={{ fontSize: 10, fontWeight: 400, color: '#5a6b5e' }}>{unit}</span>
                  </span>
                  <span style={{ fontSize: 9, color: '#a0b0a5' }}>/ {d.max}{unit}</span>
                </>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 10, color: '#a0b0a5' }}>
        Grobe Tendenz{showDetail ? '' : ' · tippen für Werte'}
      </p>
    </div>
  )
}


export default function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<TodaySummary | null>(null)
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutLogResponse[]>([])
  const [goals, setGoals] = useState<GoalsData | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
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
      getProfile().catch(() => null),
    ]).then(([meals, week, w, g, insights, profile]) => {
      setSummary(meals.data)
      setWeekSummary(week.data)
      setWorkouts(w.data)
      setGoals(g.data)
      if (profile?.data?.name) {
        setUserName(profile.data.name.split(' ')[0])
      }
      if (insights?.data?.length) {
        const todayIso = new Date().toISOString().slice(0, 10)
        const todayInsight = insights.data.find((i: { periodStart: string; content: string }) => i.periodStart === todayIso)
        if (todayInsight?.content) {
          const preview = todayInsight.content.split('\n').find((l: string) => l.trim().length > 20) ?? todayInsight.content.slice(0, 120)
          setDailyInsight(preview.replace(/\*\*/g, '').slice(0, 120))
        }
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Woche-Tab: Detailwert (nur beim Tap sichtbar) ist der Tagesdurchschnitt dieser
  // Woche – passend zum serverseitig gerasteten Wochen-Bucket. max bleibt das Tagesziel.
  const daysElapsed = ((new Date().getDay() + 6) % 7) + 1
  const avg = (weekTotal: number) => Math.round(weekTotal / daysElapsed)

  const ring = (key: 'calories' | 'protein' | 'carbs' | 'fat', fallback: number) => {
    const max = goals?.[key] ?? fallback
    if (tab === 'heute') {
      const total = { calories: 'totalCalories', protein: 'totalProtein', carbs: 'totalCarbs', fat: 'totalFat' } as const
      return {
        bucket: summary?.buckets?.[key] ?? 0,
        value: (summary?.[total[key]] as number | undefined) ?? 0,
        max,
      }
    }
    const total = { calories: 'totalCalories', protein: 'totalProtein', carbs: 'totalCarbs', fat: 'totalFat' } as const
    return {
      bucket: weekSummary?.buckets?.[key] ?? 0,
      value: avg((weekSummary?.[total[key]] as number | undefined) ?? 0),
      max,
    }
  }

  const cal = ring('calories', 2000)
  const pro = ring('protein', 150)
  const carb = ring('carbs', 250)
  const fat = ring('fat', 70)

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="px-4 pt-5">
        <p style={{ fontSize: 13, color: '#5a6b5e' }}>{today}</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111816', lineHeight: 1.2 }}>
          {greeting()}{userName ? `, ${userName}` : ''}
        </h1>
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
            <button onClick={() => navigate('/log', { state: { openWorkoutModal: true } })}
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

            <div className="flex justify-center">
              <ConcentricRings cal={cal} pro={pro} carb={carb} fat={fat} />
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Einordnung heute</div>
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
