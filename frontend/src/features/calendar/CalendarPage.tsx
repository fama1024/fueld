import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react'
import { getCalendar, type CalendarEntry, type CalendarEntryType } from './calendarApi'
import { getMeal, type MealLogResponse } from '@/features/meals/mealApi'
import { getWorkout, type WorkoutLogResponse } from '@/features/workouts/workoutApi'
import { getWeightEntry, type WeightEntry } from '@/features/weight/weightApi'

const TYPE_ICONS: Record<CalendarEntryType, string> = {
  meal: '🍽️',
  workout: '🏃',
  weight: '⚖️',
}

const TYPE_LABELS: Record<CalendarEntryType, string> = {
  meal: 'Mahlzeit',
  workout: 'Training',
  weight: 'Gewicht',
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function dayKeyFromIso(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const load = useCallback(async (d: Date) => {
    setLoading(true)
    try {
      const res = await getCalendar(monthKey(d))
      setEntries(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(cursor) }, [cursor, load])

  const byDay: Record<string, CalendarEntry[]> = {}
  for (const e of entries) {
    const key = dayKeyFromIso(e.date)
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(e)
  }

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7 // Monday-first grid

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const todayKey = dayKeyFromIso(new Date().toISOString())

  function dayKeyFor(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="p-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2" aria-label="Vorheriger Monat">
          <ChevronLeft size={20} color="#111816" />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: '#111816', textTransform: 'capitalize' }}>
          {cursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2" aria-label="Nächster Monat">
          <ChevronRight size={20} color="#111816" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS.map(w => (
          <div key={w} className="text-center" style={{ fontSize: 11, fontWeight: 600, color: '#a0b0a5' }}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`blank-${i}`} />
          const key = dayKeyFor(day)
          const dayEntries = byDay[key] ?? []
          const types = Array.from(new Set(dayEntries.map(e => e.type)))
          const isToday = key === todayKey
          return (
            <button
              key={key}
              onClick={() => dayEntries.length > 0 && setSelectedDay(key)}
              disabled={dayEntries.length === 0}
              className="flex flex-col items-center justify-center rounded-xl"
              style={{
                aspectRatio: '1',
                background: isToday ? '#dcfce7' : 'transparent',
                border: isToday ? '1px solid #16A34A' : '1px solid transparent',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#16A34A' : '#111816' }}>
                {day}
              </span>
              <div className="flex gap-0.5 mt-0.5" style={{ height: 10 }}>
                {types.map(t => <span key={t} style={{ fontSize: 8 }}>{TYPE_ICONS[t]}</span>)}
              </div>
            </button>
          )
        })}
      </div>

      {loading && <p className="text-center mt-6" style={{ fontSize: 13, color: '#a0b0a5' }}>Lädt…</p>}

      {selectedDay && (
        <DayModal
          dateKey={selectedDay}
          entries={byDay[selectedDay] ?? []}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

// ─── Day modal (list ↔ detail, same overlay) ───────────────────────────────────

type Detail =
  | { type: 'meal'; data: MealLogResponse }
  | { type: 'workout'; data: WorkoutLogResponse }
  | { type: 'weight'; data: WeightEntry }

function DayModal({ dateKey, entries, onClose }: {
  dateKey: string
  entries: CalendarEntry[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)

  const dateLabel = new Date(`${dateKey}T00:00:00`)
    .toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

  async function openDetail(entry: CalendarEntry) {
    setLoading(true)
    try {
      if (entry.type === 'meal') {
        const res = await getMeal(entry.id)
        setDetail({ type: 'meal', data: res.data })
      } else if (entry.type === 'workout') {
        const res = await getWorkout(entry.id)
        setDetail({ type: 'workout', data: res.data })
      } else {
        const res = await getWeightEntry(entry.id)
        setDetail({ type: 'weight', data: res.data })
      }
      setView('detail')
    } finally {
      setLoading(false)
    }
  }

  function backToList() {
    setView('list')
    setDetail(null)
  }

  function editOnLogPage() {
    onClose()
    navigate('/log')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full bg-white rounded-t-3xl p-5 pb-8" style={{ maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          {view === 'detail' && (
            <button onClick={backToList} aria-label="Zurück zur Liste">
              <ArrowLeft size={18} color="#5a6b5e" />
            </button>
          )}
          <h2 className="flex-1" style={{ fontSize: 16, fontWeight: 700, color: '#111816', textTransform: 'capitalize' }}>
            {dateLabel}
          </h2>
          <button onClick={onClose} aria-label="Schließen"><X size={20} color="#5a6b5e" /></button>
        </div>

        {view === 'list' && (
          <div className="space-y-2">
            {entries.map(entry => (
              <button key={entry.id} onClick={() => openDetail(entry)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                style={{ background: '#f4f6f4' }}>
                <span style={{ fontSize: 20 }}>{TYPE_ICONS[entry.type]}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111816' }}>{TYPE_LABELS[entry.type]}</span>
                <span className="ml-auto" style={{ fontSize: 12, color: '#a0b0a5' }}>
                  {new Date(entry.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
            {loading && <p style={{ fontSize: 13, color: '#a0b0a5' }}>Lädt…</p>}
          </div>
        )}

        {view === 'detail' && detail && (
          <div className="space-y-3">
            {detail.type === 'meal' && <MealDetail meal={detail.data} />}
            {detail.type === 'workout' && <WorkoutDetail workout={detail.data} />}
            {detail.type === 'weight' && <WeightDetail entry={detail.data} />}
            {detail.type !== 'weight' && (
              <button onClick={editOnLogPage} className="w-full text-center py-2"
                style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>
                Bearbeiten auf der Log-Seite →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MealDetail({ meal }: { meal: MealLogResponse }) {
  return (
    <div className="space-y-3">
      <p style={{ fontSize: 13, color: '#111816', lineHeight: 1.4 }}>{meal.summary || meal.textInput}</p>
      {(meal.calories != null || meal.protein != null || meal.carbs != null || meal.fat != null) && (
        <div className="flex gap-2">
          {[
            { l: 'kcal', v: meal.calories, c: '#16A34A' },
            { l: 'Protein', v: meal.protein != null ? `${meal.protein}g` : null, c: '#3B82F6' },
            { l: 'Carbs', v: meal.carbs != null ? `${meal.carbs}g` : null, c: '#EAB308' },
            { l: 'Fett', v: meal.fat != null ? `${meal.fat}g` : null, c: '#F97316' },
          ].filter(x => x.v != null).map(({ l, v, c }) => (
            <div key={l} className="flex-1 rounded-xl p-2 text-center" style={{ background: c + '14' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: '#5a6b5e' }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {meal.goalAlignment && (
        <div className="rounded-xl p-3" style={{ background: '#dcfce7' }}>
          <p style={{ fontSize: 12, color: '#15803d', lineHeight: 1.5 }}>🎯 {meal.goalAlignment}</p>
        </div>
      )}
      {meal.feedback && <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5 }}>{meal.feedback}</p>}
      {meal.ingredientTips && meal.ingredientTips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meal.ingredientTips.map((tip, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full"
              style={{ fontSize: 11, background: '#dcfce7', color: '#15803d' }}>{tip}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutDetail({ workout }: { workout: WorkoutLogResponse }) {
  return (
    <div className="space-y-3">
      {workout.summary && <p style={{ fontSize: 13, color: '#111816', lineHeight: 1.5 }}>{workout.summary}</p>}
      {(workout.distanceKm || workout.pacePerKm || workout.avgHeartRate || workout.caloriesBurned) && (
        <div className="flex gap-2 flex-wrap">
          {[
            { l: 'km', v: workout.distanceKm },
            { l: 'min/km', v: workout.pacePerKm },
            { l: '⌀ HF', v: workout.avgHeartRate },
            { l: 'kcal', v: workout.caloriesBurned },
          ].filter(x => x.v != null).map(({ l, v }) => (
            <div key={l} className="flex-1 rounded-xl p-2 text-center min-w-0" style={{ background: '#dcfce7', minWidth: 56 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>{v}</div>
              <div style={{ fontSize: 10, color: '#5a6b5e' }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {workout.feedback && <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5 }}>{workout.feedback}</p>}
      {workout.notes && <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5 }}>{workout.notes}</p>}
    </div>
  )
}

function WeightDetail({ entry }: { entry: WeightEntry }) {
  const rows = [
    { l: 'Gewicht', v: `${entry.weight} kg` },
    { l: 'BMI', v: entry.bmi != null ? String(entry.bmi) : null },
    { l: 'Körperfett', v: entry.bodyFatPct != null ? `${entry.bodyFatPct}%` : null },
    { l: 'Muskelmasse', v: entry.muscleMassPct != null ? `${entry.muscleMassPct}%` : null },
    { l: 'Knochenmasse', v: entry.boneMassKg != null ? `${entry.boneMassKg} kg` : null },
    { l: 'Wasser', v: entry.waterPct != null ? `${entry.waterPct}%` : null },
  ].filter((r): r is { l: string; v: string } => r.v != null)
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(r => (
        <div key={r.l} className="rounded-xl p-2" style={{ background: '#f4f6f4' }}>
          <div style={{ fontSize: 10, color: '#5a6b5e' }}>{r.l}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111816' }}>{r.v}</div>
        </div>
      ))}
    </div>
  )
}
