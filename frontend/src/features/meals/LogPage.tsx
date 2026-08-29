import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, ChevronDown, ChevronUp, X, Camera, Image, Dumbbell, Utensils } from 'lucide-react'
import {
  logMeal, getMealHistory, updateMeal, quickLogMeal,
  type MealLogResponse, type MealType, type PhotoDto
} from './mealApi'
import {
  logWorkout, getWorkoutHistory, updateWorkout, quickLogWorkout,
  type WorkoutLogResponse, type WorkoutType
} from '@/features/workouts/workoutApi'

// ─── Utils ──────────────────────────────────────────────────────────────────────

async function filesToPhotoDtos(files: File[]): Promise<PhotoDto[]> {
  return Promise.all(
    files.map(file => new Promise<PhotoDto>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const [meta, data] = (reader.result as string).split(',')
        resolve({ data, mediaType: meta.replace('data:', '').replace(';base64', '') })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    }))
  )
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function groupByDate<T extends { eatenAt?: string; performedAt?: string }>(items: T[]) {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const raw = item.eatenAt ?? item.performedAt ?? ''
    const date = raw.slice(0, 10)
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

function dateLabel(isoDate: string) {
  const today = todayIso()
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const yest = yesterday.toISOString().slice(0, 10)
  if (isoDate === today) return 'Heute'
  if (isoDate === yest) return 'Gestern'
  return new Date(isoDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'lunch',     label: 'Mittagessen' },
  { value: 'dinner',    label: 'Abendessen' },
  { value: 'snack',     label: 'Snack' },
]

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack',
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: '#16A34A', lunch: '#3B82F6', dinner: '#F97316', snack: '#EAB308',
}

const WORKOUT_TYPES: { value: WorkoutType; label: string; emoji: string }[] = [
  { value: 'running',  label: 'Laufen',     emoji: '🏃' },
  { value: 'crossfit', label: 'CrossFit',   emoji: '🏋️' },
  { value: 'cycling',  label: 'Radfahren',  emoji: '🚴' },
  { value: 'other',    label: 'Sonstiges',  emoji: '💪' },
]

// ─── Meal cards ─────────────────────────────────────────────────────────────────

function MealCard({ meal: initial, onUpdated }: {
  meal: MealLogResponse
  onUpdated: (updated: MealLogResponse) => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(initial.textInput)
  const [editMealType, setEditMealType] = useState<MealType | null>(initial.mealType)
  const [editDate, setEditDate] = useState(initial.eatenAt.slice(0, 10))
  const [editPhotos, setEditPhotos] = useState<PhotoDto[]>([])
  const [editPhotoNames, setEditPhotoNames] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [meal, setMeal] = useState(initial)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const color = MEAL_TYPE_COLORS[meal.mealType ?? ''] ?? '#16A34A'
  const typeLabel = meal.mealType ? MEAL_TYPE_LABELS[meal.mealType] : null
  const time = new Date(meal.eatenAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  async function handleSave() {
    setSaving(true)
    try {
      const res = await updateMeal(meal.id, {
        text: editText.trim(),
        photos: editPhotos.length ? editPhotos : undefined,
        mealType: editMealType,
        eatenAt: editDate,
      })
      setMeal(res.data)
      onUpdated(res.data)
      setEditing(false)
      setEditPhotos([]); setEditPhotoNames([])
    } finally { setSaving(false) }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const res = await updateMeal(meal.id, {
        text: meal.textInput,
        mealType: meal.mealType,
        eatenAt: meal.eatenAt.slice(0, 10),
      })
      setMeal(res.data)
      onUpdated(res.data)
    } finally { setAnalyzing(false) }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setEditPhotos(await filesToPhotoDtos(files))
    setEditPhotoNames(files.map(f => f.name))
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button className="w-full p-3 text-left" onClick={() => { setOpen(v => !v); setEditing(false) }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ width: 34, height: 34, background: color + '18' }}>
              <div className="rounded-full" style={{ width: 8, height: 8, background: color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {typeLabel && <span style={{ fontSize: 11, fontWeight: 600, color }}>{typeLabel}</span>}
                <span style={{ fontSize: 11, color: '#a0b0a5' }}>· {time}</span>
              </div>
              <p className="truncate" style={{ fontSize: 13, color: '#111816', lineHeight: 1.3 }}>
                {meal.summary || meal.textInput}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {meal.calories != null && (
              <div className="text-right">
                <div style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>{meal.calories}</div>
                <div style={{ fontSize: 10, color: '#5a6b5e' }}>kcal</div>
              </div>
            )}
            {open ? <ChevronUp size={14} color="#a0b0a5" /> : <ChevronDown size={14} color="#a0b0a5" />}
          </div>
        </div>
        {!open && (
          <div className="flex gap-3 mt-1.5" style={{ paddingLeft: 42 }}>
            {[{ l: 'P', v: meal.protein, c: '#3B82F6' }, { l: 'C', v: meal.carbs, c: '#EAB308' }, { l: 'F', v: meal.fat, c: '#F97316' }]
              .filter(x => x.v != null)
              .map(({ l, v, c }) => (
                <span key={l} style={{ fontSize: 11, color: '#5a6b5e' }}>
                  <span style={{ color: c, fontWeight: 600 }}>{l}</span> {v}g
                </span>
              ))}
          </div>
        )}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #eef1ee' }}>
          {editing ? (
            <div className="p-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEditMealType(editMealType === t.value ? null : t.value)}
                    className="px-3 py-1 rounded-full"
                    style={{ fontSize: 12, fontWeight: 600, background: editMealType === t.value ? '#16A34A' : '#eef1ee', color: editMealType === t.value ? '#fff' : '#5a6b5e' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} disabled={saving}
                className="w-full rounded-xl p-3 resize-none outline-none"
                style={{ background: '#f4f6f4', fontSize: 14, color: '#111816', border: 'none' }} />
              <div className="flex items-center gap-2">
                <label style={{ fontSize: 12, color: '#5a6b5e', fontWeight: 600 }}>Datum</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="rounded-lg px-3 py-1.5 text-sm outline-none"
                  style={{ background: '#f4f6f4', border: 'none', color: '#111816' }} />
              </div>
              <div className="flex gap-2">
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                <button onClick={() => cameraRef.current?.click()} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{ background: '#eef1ee', fontSize: 12, fontWeight: 600, color: '#111816' }}>
                  <Camera size={14} color="#16A34A" /> Kamera
                </button>
                <button onClick={() => fileRef.current?.click()} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{ background: '#eef1ee', fontSize: 12, fontWeight: 600, color: '#111816' }}>
                  <Image size={14} color="#16A34A" />
                  {editPhotoNames.length > 0 ? `${editPhotoNames.length} Foto(s)` : 'Galerie'}
                </button>
                <button onClick={handleSave} disabled={saving || !editText.trim()}
                  className="ml-auto px-4 py-2 rounded-xl text-white disabled:opacity-50"
                  style={{ background: '#16A34A', fontSize: 13, fontWeight: 700 }}>
                  {saving ? 'Analysiere…' : 'Neu analysieren'}
                </button>
              </div>
              <button onClick={() => setEditing(false)} style={{ fontSize: 12, color: '#a0b0a5' }}>Abbrechen</button>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {(meal.protein != null || meal.carbs != null || meal.fat != null) && (
                <div className="flex gap-2">
                  {[{ l: 'Protein', v: meal.protein, c: '#3B82F6' }, { l: 'Kohlenhydrate', v: meal.carbs, c: '#EAB308' }, { l: 'Fett', v: meal.fat, c: '#F97316' }]
                    .filter(x => x.v != null)
                    .map(({ l, v, c }) => (
                      <div key={l} className="flex-1 rounded-xl p-2 text-center" style={{ background: c + '14' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}g</div>
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
              {meal.feedback && (
                <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5 }}>{meal.feedback}</p>
              )}
              {meal.ingredientTips && meal.ingredientTips.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#5a6b5e', marginBottom: 6 }}>Empfohlen heute noch:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {meal.ingredientTips.map((tip, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full"
                        style={{ fontSize: 11, background: '#dcfce7', color: '#15803d' }}>{tip}</span>
                    ))}
                  </div>
                </div>
              )}
              {meal.calories == null && (
                <button onClick={handleAnalyze} disabled={analyzing}
                  className="w-full py-2.5 rounded-xl text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#16A34A', fontSize: 13, fontWeight: 700 }}>
                  {analyzing ? 'Analysiere…' : '✨ KI-Analyse starten'}
                </button>
              )}
              <button onClick={() => { setEditing(true); setEditText(meal.textInput); setEditMealType(meal.mealType); setEditDate(meal.eatenAt.slice(0, 10)) }}
                style={{ fontSize: 12, color: '#a0b0a5' }}>Bearbeiten</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Workout card ────────────────────────────────────────────────────────────────

function WorkoutCard({ workout: initial, onUpdated }: {
  workout: WorkoutLogResponse
  onUpdated: (updated: WorkoutLogResponse) => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editType, setEditType] = useState<WorkoutType>(initial.type)
  const [editDuration, setEditDuration] = useState(initial.durationMinutes?.toString() ?? '')
  const [editNotes, setEditNotes] = useState(initial.notes ?? '')
  const [editDate, setEditDate] = useState(initial.performedAt.slice(0, 10))
  const [editPhotos, setEditPhotos] = useState<PhotoDto[]>([])
  const [editPhotoNames, setEditPhotoNames] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [workout, setWorkout] = useState(initial)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const wt = WORKOUT_TYPES.find(t => t.value === workout.type)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await updateWorkout(workout.id, {
        type: editType, durationMinutes: editDuration ? parseInt(editDuration) : undefined,
        notes: editNotes.trim() || undefined, photos: editPhotos.length ? editPhotos : undefined,
        performedAt: editDate,
      })
      setWorkout(res.data); onUpdated(res.data)
      setEditing(false); setEditPhotos([]); setEditPhotoNames([])
    } finally { setSaving(false) }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const res = await updateWorkout(workout.id, {
        type: workout.type,
        durationMinutes: workout.durationMinutes ?? undefined,
        notes: workout.notes ?? undefined,
        performedAt: workout.performedAt.slice(0, 10),
      })
      setWorkout(res.data); onUpdated(res.data)
    } finally { setAnalyzing(false) }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setEditPhotos(await filesToPhotoDtos(files))
    setEditPhotoNames(files.map(f => f.name))
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button className="w-full p-3 text-left" onClick={() => { setOpen(v => !v); setEditing(false) }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
              style={{ width: 36, height: 36, background: '#dcfce7' }}>
              {wt?.emoji ?? '💪'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111816' }}>{wt?.label ?? workout.type}</div>
              <div style={{ fontSize: 12, color: '#5a6b5e' }}>
                {workout.durationMinutes ? `${workout.durationMinutes} min` : ''}
                {workout.durationMinutes && workout.caloriesBurned ? ' · ' : ''}
                {workout.caloriesBurned ? `${workout.caloriesBurned} kcal` : ''}
              </div>
            </div>
          </div>
          {open ? <ChevronUp size={14} color="#a0b0a5" /> : <ChevronDown size={14} color="#a0b0a5" />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #eef1ee' }}>
          {editing ? (
            <div className="p-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {WORKOUT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEditType(t.value)}
                    className="px-3 py-1 rounded-full"
                    style={{ fontSize: 12, fontWeight: 600, background: editType === t.value ? '#16A34A' : '#eef1ee', color: editType === t.value ? '#fff' : '#5a6b5e' }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label style={{ fontSize: 11, color: '#5a6b5e', fontWeight: 600 }}>Dauer (Min.)</label>
                  <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
                </div>
                <div className="flex-1">
                  <label style={{ fontSize: 11, color: '#5a6b5e', fontWeight: 600 }}>Datum</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
                </div>
              </div>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} disabled={saving}
                className="w-full rounded-xl p-3 resize-none outline-none"
                style={{ background: '#f4f6f4', fontSize: 14, color: '#111816', border: 'none' }} />
              <div className="flex gap-2">
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                <button onClick={() => cameraRef.current?.click()} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{ background: '#eef1ee', fontSize: 12, fontWeight: 600, color: '#111816' }}>
                  <Camera size={14} color="#16A34A" /> Kamera
                </button>
                <button onClick={() => fileRef.current?.click()} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{ background: '#eef1ee', fontSize: 12, fontWeight: 600, color: '#111816' }}>
                  <Image size={14} color="#16A34A" />
                  {editPhotoNames.length > 0 ? `${editPhotoNames.length} Screenshot(s)` : 'Galerie'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="ml-auto px-4 py-2 rounded-xl text-white disabled:opacity-50"
                  style={{ background: '#16A34A', fontSize: 13, fontWeight: 700 }}>
                  {saving ? 'Analysiere…' : 'Neu analysieren'}
                </button>
              </div>
              <button onClick={() => setEditing(false)} style={{ fontSize: 12, color: '#a0b0a5' }}>Abbrechen</button>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {workout.summary && <p style={{ fontSize: 13, color: '#111816', lineHeight: 1.5 }}>{workout.summary}</p>}
              {(workout.distanceKm || workout.pacePerKm || workout.avgHeartRate || workout.caloriesBurned) && (
                <div className="flex gap-2 flex-wrap">
                  {[
                    { l: 'km', v: workout.distanceKm },
                    { l: 'min/km', v: workout.pacePerKm },
                    { l: '⌀ HF', v: workout.avgHeartRate },
                    { l: 'kcal', v: workout.caloriesBurned },
                  ].filter(x => x.v != null).map(({ l, v }) => (
                    <div key={l} className="flex-1 rounded-xl p-2 text-center min-w-0"
                      style={{ background: '#dcfce7', minWidth: 56 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>{v}</div>
                      <div style={{ fontSize: 10, color: '#5a6b5e' }}>{l}</div>
                    </div>
                  ))}
                </div>
              )}
              {workout.feedback && <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5 }}>{workout.feedback}</p>}
              {workout.missingData && workout.missingData.length > 0 && (
                <div className="rounded-xl p-2" style={{ background: '#fff8e1' }}>
                  <p style={{ fontSize: 11, color: '#92400e' }}>{workout.missingData.join(' · ')}</p>
                </div>
              )}
              {workout.summary == null && (
                <button onClick={handleAnalyze} disabled={analyzing}
                  className="w-full py-2.5 rounded-xl text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#16A34A', fontSize: 13, fontWeight: 700 }}>
                  {analyzing ? 'Analysiere…' : '✨ KI-Analyse starten'}
                </button>
              )}
              <button onClick={() => { setEditing(true); setEditType(workout.type); setEditDuration(workout.durationMinutes?.toString() ?? ''); setEditNotes(workout.notes ?? ''); setEditDate(workout.performedAt.slice(0, 10)) }}
                style={{ fontSize: 12, color: '#a0b0a5' }}>Bearbeiten</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Bottom-sheet modals ─────────────────────────────────────────────────────────

function MealModal({ onClose, onAdded }: { onClose: () => void; onAdded: (m: MealLogResponse) => void }) {
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayIso())
  const [photos, setPhotos] = useState<PhotoDto[]>([])
  const [photoNames, setPhotoNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mCalories, setMCalories] = useState('')
  const [mProtein, setMProtein] = useState('')
  const [mCarbs, setMCarbs] = useState('')
  const [mFat, setMFat] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPhotos(await filesToPhotoDtos(files))
    setPhotoNames(files.map(f => f.name))
  }

  async function handleSubmit() {
    if (!text.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await logMeal({ text: text.trim(), photos: photos.length ? photos : undefined, mealType, eatenAt: date })
      onAdded(res.data)
      onClose()
    } catch {
      setError('Analyse fehlgeschlagen. Du kannst die Werte unten manuell eintragen und ohne KI speichern.')
    } finally { setLoading(false) }
  }

  async function handleQuickSave() {
    if (!text.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await quickLogMeal({
        text: text.trim(),
        calories: mCalories ? parseInt(mCalories) : undefined,
        protein: mProtein ? parseInt(mProtein) : undefined,
        carbs: mCarbs ? parseInt(mCarbs) : undefined,
        fat: mFat ? parseInt(mFat) : undefined,
        mealType,
      })
      onAdded(res.data)
      onClose()
    } catch {
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full bg-white rounded-t-3xl p-5 pb-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111816' }}>Mahlzeit loggen</h2>
          <button onClick={onClose}><X size={20} color="#5a6b5e" /></button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {MEAL_TYPES.map(t => (
            <button key={t.value} onClick={() => setMealType(mealType === t.value ? null : t.value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full"
              style={{ fontSize: 13, fontWeight: 600, background: mealType === t.value ? '#16A34A' : '#eef1ee', color: mealType === t.value ? '#fff' : '#5a6b5e' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <label style={{ fontSize: 12, color: '#5a6b5e', fontWeight: 600 }}>Datum</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-sm outline-none"
            style={{ background: '#f4f6f4', border: 'none', color: '#111816' }} />
        </div>

        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Was hast du gegessen? Zutaten, Mengen oder einfach beschreiben…"
          rows={3} className="w-full rounded-xl p-3 resize-none outline-none mb-3"
          style={{ background: '#f4f6f4', fontSize: 14, color: '#111816', border: 'none' }} />

        <div className="flex gap-2 mb-4">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <button onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl flex-1"
            style={{ background: '#eef1ee', fontSize: 13, fontWeight: 600, color: '#111816' }}>
            <Camera size={16} color="#16A34A" /> Kamera
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl flex-1"
            style={{ background: '#eef1ee', fontSize: 13, fontWeight: 600, color: '#111816' }}>
            <Image size={16} color="#16A34A" />
            {photoNames.length > 0 ? `${photoNames.length} Foto(s)` : 'Galerie'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#5a6b5e', fontWeight: 600, marginBottom: 8 }}>
          Optional: Werte manuell eintragen (ohne KI speichern)
        </p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'kcal', value: mCalories, set: setMCalories },
            { label: 'P (g)', value: mProtein, set: setMProtein },
            { label: 'C (g)', value: mCarbs, set: setMCarbs },
            { label: 'F (g)', value: mFat, set: setMFat },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <input type="number" value={value} onChange={e => set(e.target.value)} placeholder="0"
                className="w-full px-2 py-2 rounded-xl outline-none text-center"
                style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
              <div className="text-center mt-1" style={{ fontSize: 10, color: '#5a6b5e' }}>{label}</div>
            </div>
          ))}
        </div>

        {error && <p className="mb-3 text-sm" style={{ color: '#dc2626' }}>{error}</p>}

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={loading || !text.trim()}
            className="flex-1 py-3.5 rounded-xl text-white disabled:opacity-50"
            style={{ background: '#16A34A', fontSize: 15, fontWeight: 700 }}>
            {loading ? 'Analysiere…' : 'KI-Analyse starten ✨'}
          </button>
          <button onClick={handleQuickSave} disabled={loading || !text.trim()}
            className="flex-1 py-3.5 rounded-xl disabled:opacity-50"
            style={{ background: '#eef1ee', fontSize: 15, fontWeight: 700, color: '#111816' }}>
            Ohne KI speichern
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkoutModal({ onClose, onAdded }: { onClose: () => void; onAdded: (w: WorkoutLogResponse) => void }) {
  const [workoutType, setWorkoutType] = useState<WorkoutType>('crossfit')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(todayIso())
  const [photos, setPhotos] = useState<PhotoDto[]>([])
  const [photoNames, setPhotoNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wDistance, setWDistance] = useState('')
  const [wPace, setWPace] = useState('')
  const [wAvgHr, setWAvgHr] = useState('')
  const [wMaxHr, setWMaxHr] = useState('')
  const [wCaloriesBurned, setWCaloriesBurned] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPhotos(await filesToPhotoDtos(files))
    setPhotoNames(files.map(f => f.name))
  }

  async function handleSubmit() {
    setLoading(true); setError(null)
    try {
      const res = await logWorkout({
        type: workoutType,
        durationMinutes: duration ? parseInt(duration) : undefined,
        notes: notes.trim() || undefined,
        photos: photos.length ? photos : undefined,
        performedAt: date,
      })
      onAdded(res.data)
      onClose()
    } catch {
      setError('Analyse fehlgeschlagen. Du kannst die Werte unten manuell eintragen und ohne KI speichern.')
    } finally { setLoading(false) }
  }

  async function handleQuickSave() {
    setLoading(true); setError(null)
    try {
      const res = await quickLogWorkout({
        type: workoutType,
        durationMinutes: duration ? parseInt(duration) : undefined,
        notes: notes.trim() || undefined,
        performedAt: date,
        distanceKm: wDistance ? parseFloat(wDistance) : undefined,
        pacePerKm: wPace.trim() || undefined,
        avgHeartRate: wAvgHr ? parseInt(wAvgHr) : undefined,
        maxHeartRate: wMaxHr ? parseInt(wMaxHr) : undefined,
        caloriesBurned: wCaloriesBurned ? parseInt(wCaloriesBurned) : undefined,
      })
      onAdded(res.data)
      onClose()
    } catch {
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full bg-white rounded-t-3xl p-5 pb-8" style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111816' }}>Training loggen</h2>
          <button onClick={onClose}><X size={20} color="#5a6b5e" /></button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {WORKOUT_TYPES.map(t => (
            <button key={t.value} onClick={() => setWorkoutType(t.value)}
              className="px-3 py-1.5 rounded-full"
              style={{ fontSize: 13, fontWeight: 600, background: workoutType === t.value ? '#16A34A' : '#eef1ee', color: workoutType === t.value ? '#fff' : '#5a6b5e' }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label style={{ fontSize: 11, color: '#5a6b5e', fontWeight: 600 }}>Dauer (Minuten)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
              placeholder="z.B. 45"
              className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
          </div>
          <div className="flex-1">
            <label style={{ fontSize: 11, color: '#5a6b5e', fontWeight: 600 }}>Datum</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
          </div>
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notizen oder Garmin-Screenshot-Beschreibung…"
          rows={2} className="w-full rounded-xl p-3 resize-none outline-none mb-3"
          style={{ background: '#f4f6f4', fontSize: 14, color: '#111816', border: 'none' }} />

        <div className="flex gap-2 mb-4">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <button onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl flex-1"
            style={{ background: '#eef1ee', fontSize: 13, fontWeight: 600, color: '#111816' }}>
            <Camera size={16} color="#16A34A" /> Garmin Screenshot
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl flex-1"
            style={{ background: '#eef1ee', fontSize: 13, fontWeight: 600, color: '#111816' }}>
            <Image size={16} color="#16A34A" />
            {photoNames.length > 0 ? `${photoNames.length} Screenshot(s)` : 'Galerie'}
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#5a6b5e', fontWeight: 600, marginBottom: 8 }}>
          Optional: Werte manuell eintragen (ohne KI speichern)
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <input type="number" value={wDistance} onChange={e => setWDistance(e.target.value)} placeholder="0.0"
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
            <div className="mt-1" style={{ fontSize: 10, color: '#5a6b5e' }}>Distanz (km)</div>
          </div>
          <div>
            <input type="text" value={wPace} onChange={e => setWPace(e.target.value)} placeholder="z.B. 5:30"
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
            <div className="mt-1" style={{ fontSize: 10, color: '#5a6b5e' }}>Pace (min/km)</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <input type="number" value={wAvgHr} onChange={e => setWAvgHr(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
            <div className="mt-1" style={{ fontSize: 10, color: '#5a6b5e' }}>⌀ HF</div>
          </div>
          <div>
            <input type="number" value={wMaxHr} onChange={e => setWMaxHr(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
            <div className="mt-1" style={{ fontSize: 10, color: '#5a6b5e' }}>Max HF</div>
          </div>
          <div>
            <input type="number" value={wCaloriesBurned} onChange={e => setWCaloriesBurned(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
            <div className="mt-1" style={{ fontSize: 10, color: '#5a6b5e' }}>kcal</div>
          </div>
        </div>

        {error && <p className="mb-3 text-sm" style={{ color: '#dc2626' }}>{error}</p>}

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3.5 rounded-xl text-white disabled:opacity-50"
            style={{ background: '#16A34A', fontSize: 15, fontWeight: 700 }}>
            {loading ? 'Analysiere…' : 'Training speichern ✓'}
          </button>
          <button onClick={handleQuickSave} disabled={loading}
            className="flex-1 py-3.5 rounded-xl disabled:opacity-50"
            style={{ background: '#eef1ee', fontSize: 15, fontWeight: 700, color: '#111816' }}>
            Ohne KI speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────────

type Tab = 'meal' | 'workout'

export default function LogPage() {
  const location = useLocation()
  const [tab, setTab] = useState<Tab>('meal')
  const [showMealModal, setShowMealModal] = useState(false)
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [mealHistory, setMealHistory] = useState<MealLogResponse[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLogResponse[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    getMealHistory().then(r => setMealHistory(r.data)).catch(() => {})
    getWorkoutHistory().then(r => setWorkoutHistory(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if ((location.state as { openWorkoutModal?: boolean } | null)?.openWorkoutModal) {
      setTab('workout')
      setShowWorkoutModal(true)
    }
  }, [location.state])

  const mealGroups = groupByDate(mealHistory)
  const workoutGroups = groupByDate(workoutHistory as Array<WorkoutLogResponse & { eatenAt?: string }>)

  const eligibleIds = tab === 'meal'
    ? mealHistory.filter(m => m.calories == null).map(m => m.id)
    : workoutHistory.filter(w => w.summary == null).map(w => w.id)

  function switchTab(v: Tab) {
    setTab(v)
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === eligibleIds.length ? new Set() : new Set(eligibleIds))
  }

  async function analyzeMealById(id: string) {
    const meal = mealHistory.find(m => m.id === id)
    if (!meal) return
    const res = await updateMeal(id, {
      text: meal.textInput,
      mealType: meal.mealType,
      eatenAt: meal.eatenAt.slice(0, 10),
    })
    setMealHistory(prev => prev.map(x => x.id === id ? res.data : x))
  }

  async function analyzeWorkoutById(id: string) {
    const workout = workoutHistory.find(w => w.id === id)
    if (!workout) return
    const res = await updateWorkout(id, {
      type: workout.type,
      durationMinutes: workout.durationMinutes ?? undefined,
      notes: workout.notes ?? undefined,
      performedAt: workout.performedAt.slice(0, 10),
    })
    setWorkoutHistory(prev => prev.map(x => x.id === id ? res.data : x))
  }

  async function handleBulkAnalyze() {
    const ids = Array.from(selectedIds)
    setBulkAnalyzing(true)
    setBulkProgress({ done: 0, total: ids.length })
    for (const id of ids) {
      try {
        if (tab === 'meal') await analyzeMealById(id)
        else await analyzeWorkoutById(id)
      } catch {
        // einzelner Fehler soll die restliche Auswahl nicht abbrechen
      }
      setBulkProgress(p => ({ ...p, done: p.done + 1 }))
    }
    setBulkAnalyzing(false)
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111816' }}>Log</h1>
        <p style={{ fontSize: 13, color: '#5a6b5e' }}>Deine Ernährung & Trainings</p>
      </div>

      {/* Tabs + add button */}
      <div className="flex px-4 gap-2 mb-3 items-center">
        {([
          { v: 'meal', icon: Utensils, label: 'Mahlzeiten' },
          { v: 'workout', icon: Dumbbell, label: 'Training' },
        ] as const).map(({ v, icon: Icon, label }) => (
          <button key={v} onClick={() => switchTab(v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
            style={{ fontSize: 14, fontWeight: 600, background: tab === v ? '#16A34A' : '#eef1ee', color: tab === v ? '#fff' : '#5a6b5e', transition: 'all 0.2s' }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
        {eligibleIds.length > 0 && (
          <button onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()) }}
            style={{ fontSize: 12, fontWeight: 600, color: '#16A34A' }}>
            {selectMode ? 'Abbrechen' : 'Auswählen'}
          </button>
        )}
        <button onClick={() => tab === 'meal' ? setShowMealModal(true) : setShowWorkoutModal(true)}
          className="ml-auto flex items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, background: '#dcfce7', flexShrink: 0 }}>
          <Plus size={18} color="#16A34A" />
        </button>
      </div>

      {selectMode && (
        <div className="flex items-center gap-3 px-4 mb-3">
          <button onClick={toggleSelectAll} style={{ fontSize: 12, color: '#5a6b5e', fontWeight: 600 }}>
            {selectedIds.size === eligibleIds.length ? 'Keine auswählen' : 'Alle auswählen'}
          </button>
          <span style={{ fontSize: 12, color: '#5a6b5e' }}>{selectedIds.size} ausgewählt</span>
          <button onClick={handleBulkAnalyze} disabled={selectedIds.size === 0 || bulkAnalyzing}
            className="ml-auto px-4 py-2 rounded-xl text-white disabled:opacity-50"
            style={{ background: '#16A34A', fontSize: 13, fontWeight: 700 }}>
            {bulkAnalyzing ? `Analysiere ${bulkProgress.done}/${bulkProgress.total}…` : `✨ KI-Analyse starten (${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* History grouped by date */}
      <div className="flex flex-col gap-4 px-4">
        {tab === 'meal' ? (
          mealGroups.length === 0 ? (
            <div className="py-10 text-center">
              <p style={{ fontSize: 14, color: '#5a6b5e' }}>Noch keine Mahlzeiten geloggt.</p>
            </div>
          ) : mealGroups.map(([date, meals]) => (
            <div key={date}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6b5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dateLabel(date)}
              </div>
              <div className="flex flex-col gap-2">
                {meals.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    {selectMode && (
                      <div style={{ width: 20, flexShrink: 0 }}>
                        {m.calories == null && (
                          <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelected(m.id)}
                            style={{ width: 18, height: 18, accentColor: '#16A34A' }} />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <MealCard meal={m}
                        onUpdated={updated => setMealHistory(prev => prev.map(x => x.id === updated.id ? updated : x))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          workoutGroups.length === 0 ? (
            <div className="py-10 text-center">
              <p style={{ fontSize: 14, color: '#5a6b5e' }}>Noch kein Training geloggt.</p>
            </div>
          ) : workoutGroups.map(([date, workouts]) => (
            <div key={date}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6b5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dateLabel(date)}
              </div>
              <div className="flex flex-col gap-2">
                {workouts.map(w => (
                  <div key={w.id} className="flex items-center gap-2">
                    {selectMode && (
                      <div style={{ width: 20, flexShrink: 0 }}>
                        {w.summary == null && (
                          <input type="checkbox" checked={selectedIds.has(w.id)} onChange={() => toggleSelected(w.id)}
                            style={{ width: 18, height: 18, accentColor: '#16A34A' }} />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <WorkoutCard workout={w}
                        onUpdated={updated => setWorkoutHistory(prev => prev.map(x => x.id === updated.id ? updated : x))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showMealModal && (
        <MealModal onClose={() => setShowMealModal(false)}
          onAdded={m => setMealHistory(prev => [m, ...prev])} />
      )}
      {showWorkoutModal && (
        <WorkoutModal onClose={() => setShowWorkoutModal(false)}
          onAdded={w => setWorkoutHistory(prev => [w, ...prev])} />
      )}
    </div>
  )
}
