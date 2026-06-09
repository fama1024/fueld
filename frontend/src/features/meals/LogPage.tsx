import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  logMeal, getMealHistory, updateMeal,
  type MealLogResponse, type MealType, type PhotoDto
} from './mealApi'
import {
  logWorkout, getWorkoutHistory, updateWorkout,
  type WorkoutLogResponse, type WorkoutType
} from '@/features/workouts/workoutApi'

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Meal type chips ───────────────────────────────────────────────────────────

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'lunch',     label: 'Mittagessen' },
  { value: 'dinner',    label: 'Abendessen' },
  { value: 'snack',     label: 'Snack' },
]

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch:     'Mittagessen',
  dinner:    'Abendessen',
  snack:     'Snack',
}

function MealTypeChips({ value, onChange }: {
  value: MealType | null; onChange: (v: MealType | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MEAL_TYPES.map(t => (
        <button key={t.value} type="button"
          onClick={() => onChange(value === t.value ? null : t.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            value === t.value
              ? 'bg-[#16A34A] text-white border-[#16A34A]'
              : 'bg-white text-neutral-500 border-neutral-300 hover:border-[#16A34A]'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Meal components ───────────────────────────────────────────────────────────

function MacroCard({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-xl p-3 gap-0.5">
      <span className="text-xl font-bold text-neutral-900">{value ?? '–'}</span>
      <span className="text-xs text-neutral-500">{unit}</span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  )
}

function MealAnalysisCard({ meal }: { meal: MealLogResponse }) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-4">
      {meal.summary && <p className="text-sm font-medium text-neutral-700">{meal.summary}</p>}

      <div className="grid grid-cols-4 gap-2">
        <MacroCard label="Kalorien" value={meal.calories} unit="kcal" />
        <MacroCard label="Protein" value={meal.protein} unit="g" />
        <MacroCard label="Kohlenhydrate" value={meal.carbs} unit="g" />
        <MacroCard label="Fett" value={meal.fat} unit="g" />
      </div>

      {meal.goalAlignment && (
        <div className="text-sm text-neutral-700 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-xl p-3">
          <span className="font-semibold text-[#16A34A]">Ziele: </span>
          {meal.goalAlignment}
        </div>
      )}
      {meal.feedback && (
        <div className="text-sm text-neutral-700 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <span className="font-semibold text-blue-700">Feedback: </span>
          {meal.feedback}
        </div>
      )}
      {meal.tip && (
        <div className="text-sm text-neutral-700 bg-green-50 border border-green-100 rounded-xl p-3">
          <span className="font-semibold text-green-700">Tipp: </span>
          {meal.tip}
        </div>
      )}
      {meal.ingredientTips && meal.ingredientTips.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Heute noch empfohlen</p>
          <div className="flex flex-wrap gap-2">
            {meal.ingredientTips.map((tip, i) => (
              <span key={i}
                className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1">
                {tip}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MealHistoryItem({ meal: initial, onUpdated }: {
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
  const [meal, setMeal] = useState(initial)
  const fileRef = useRef<HTMLInputElement>(null)

  const date = new Date(meal.eatenAt).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })

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
      setEditPhotos([])
      setEditPhotoNames([])
    } catch {
      // keep editing open
    } finally {
      setSaving(false)
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setEditPhotos(await filesToPhotoDtos(files))
    setEditPhotoNames(files.map(f => f.name))
  }

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button onClick={() => { setOpen(v => !v); setEditing(false) }}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition-colors text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {meal.mealType && (
              <span className="text-xs bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5 shrink-0">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </span>
            )}
            <p className="text-sm font-medium text-neutral-800 line-clamp-1">{meal.textInput}</p>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {meal.calories != null && (
            <span className="text-sm font-semibold text-neutral-600">{meal.calories} kcal</span>
          )}
          <svg className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <MealTypeChips value={editMealType} onChange={setEditMealType} />
              <Textarea value={editText} onChange={e => setEditText(e.target.value)}
                rows={3} className="resize-none" disabled={saving} />
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-neutral-500 shrink-0">Datum</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" multiple
                  className="hidden" onChange={handleFiles} />
                <Button type="button" variant="outline" size="lg"
                  onClick={() => fileRef.current?.click()} disabled={saving}>
                  <PhotoIcon />
                  {editPhotoNames.length > 0 ? `${editPhotoNames.length} Foto(s)` : 'Foto ersetzen'}
                </Button>
                <Button size="lg" disabled={saving || !editText.trim()} onClick={handleSave}>
                  {saving ? <LoadingSpinner label="Analysiere…" /> : 'Speichern & neu analysieren'}
                </Button>
                <button onClick={() => setEditing(false)}
                  className="text-sm text-neutral-400 hover:text-neutral-600 ml-1">
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <MealAnalysisCard meal={meal} />
              <button onClick={() => {
                setEditing(true)
                setEditText(meal.textInput)
                setEditMealType(meal.mealType)
                setEditDate(meal.eatenAt.slice(0, 10))
              }} className="text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors">
                Bearbeiten
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Workout components ────────────────────────────────────────────────────────

const WORKOUT_LABELS: Record<WorkoutType, string> = {
  running: 'Laufen', crossfit: 'CrossFit', cycling: 'Radfahren', other: 'Sonstiges',
}

function WorkoutAnalysisCard({ workout }: { workout: WorkoutLogResponse }) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-4">
      {workout.summary && <p className="text-sm font-medium text-neutral-700">{workout.summary}</p>}
      {(workout.distanceKm || workout.pacePerKm || workout.avgHeartRate || workout.caloriesBurned) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {workout.distanceKm != null && (
            <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-xl p-3 gap-0.5">
              <span className="text-xl font-bold text-neutral-900">{workout.distanceKm}</span>
              <span className="text-xs text-neutral-400">km</span>
            </div>
          )}
          {workout.pacePerKm && (
            <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-xl p-3 gap-0.5">
              <span className="text-xl font-bold text-neutral-900">{workout.pacePerKm}</span>
              <span className="text-xs text-neutral-400">min/km</span>
            </div>
          )}
          {workout.avgHeartRate != null && (
            <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-xl p-3 gap-0.5">
              <span className="text-xl font-bold text-neutral-900">{workout.avgHeartRate}</span>
              <span className="text-xs text-neutral-400">⌀ HF</span>
            </div>
          )}
          {workout.caloriesBurned != null && (
            <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-xl p-3 gap-0.5">
              <span className="text-xl font-bold text-neutral-900">{workout.caloriesBurned}</span>
              <span className="text-xs text-neutral-400">kcal</span>
            </div>
          )}
        </div>
      )}
      {workout.feedback && (
        <div className="text-sm text-neutral-700 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <span className="font-semibold text-blue-700">Feedback: </span>{workout.feedback}
        </div>
      )}
      {workout.missingData && workout.missingData.length > 0 && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <span className="font-semibold">Für vollständige Analyse hilfreich: </span>
          {workout.missingData.join(', ')}
        </div>
      )}
    </div>
  )
}

function WorkoutHistoryItem({ workout: initial, onUpdated }: {
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
  const [workout, setWorkout] = useState(initial)
  const fileRef = useRef<HTMLInputElement>(null)

  const date = new Date(workout.performedAt).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })

  async function handleSave() {
    setSaving(true)
    try {
      const res = await updateWorkout(workout.id, {
        type: editType,
        durationMinutes: editDuration ? parseInt(editDuration) : undefined,
        notes: editNotes.trim() || undefined,
        photos: editPhotos.length ? editPhotos : undefined,
        performedAt: editDate,
      })
      setWorkout(res.data)
      onUpdated(res.data)
      setEditing(false)
      setEditPhotos([])
      setEditPhotoNames([])
    } catch {
      // keep editing open
    } finally {
      setSaving(false)
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setEditPhotos(await filesToPhotoDtos(files))
    setEditPhotoNames(files.map(f => f.name))
  }

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button onClick={() => { setOpen(v => !v); setEditing(false) }}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition-colors text-left">
        <div>
          <p className="text-sm font-medium text-neutral-800">
            {WORKOUT_LABELS[workout.type]}
            {workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ''}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {workout.caloriesBurned != null && (
            <span className="text-sm font-semibold text-neutral-600">{workout.caloriesBurned} kcal</span>
          )}
          <svg className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-500">Sportart</label>
                  <select value={editType} onChange={e => setEditType(e.target.value as WorkoutType)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]">
                    <option value="running">Laufen</option>
                    <option value="crossfit">CrossFit</option>
                    <option value="cycling">Radfahren</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-500">Dauer (Min)</label>
                  <input type="number" min={1} value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
                </div>
              </div>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                rows={2} className="resize-none" disabled={saving} />
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-neutral-500 shrink-0">Datum</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" multiple
                  className="hidden" onChange={handleFiles} />
                <Button type="button" variant="outline" size="lg"
                  onClick={() => fileRef.current?.click()} disabled={saving}>
                  <PhotoIcon />
                  {editPhotoNames.length > 0 ? `${editPhotoNames.length} Screenshot(s)` : 'Screenshot ersetzen'}
                </Button>
                <Button size="lg" disabled={saving} onClick={handleSave}>
                  {saving ? <LoadingSpinner label="Analysiere…" /> : 'Speichern & neu analysieren'}
                </Button>
                <button onClick={() => setEditing(false)}
                  className="text-sm text-neutral-400 hover:text-neutral-600 ml-1">
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <WorkoutAnalysisCard workout={workout} />
              <button onClick={() => {
                setEditing(true)
                setEditType(workout.type)
                setEditDuration(workout.durationMinutes?.toString() ?? '')
                setEditNotes(workout.notes ?? '')
                setEditDate(workout.performedAt.slice(0, 10))
              }} className="text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors">
                Bearbeiten
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'meal' | 'workout'

export default function LogPage() {
  const [tab, setTab] = useState<Tab>('meal')

  const [mealText, setMealText] = useState('')
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [mealDate, setMealDate] = useState(todayIso())
  const [mealPhotos, setMealPhotos] = useState<PhotoDto[]>([])
  const [mealPhotoNames, setMealPhotoNames] = useState<string[]>([])
  const [mealLoading, setMealLoading] = useState(false)
  const [mealResult, setMealResult] = useState<MealLogResponse | null>(null)
  const [mealError, setMealError] = useState<string | null>(null)
  const [mealHistory, setMealHistory] = useState<MealLogResponse[]>([])
  const mealFileRef = useRef<HTMLInputElement>(null)

  const [workoutType, setWorkoutType] = useState<WorkoutType>('running')
  const [workoutDuration, setWorkoutDuration] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [workoutDate, setWorkoutDate] = useState(todayIso())
  const [workoutPhotos, setWorkoutPhotos] = useState<PhotoDto[]>([])
  const [workoutPhotoNames, setWorkoutPhotoNames] = useState<string[]>([])
  const [workoutLoading, setWorkoutLoading] = useState(false)
  const [workoutResult, setWorkoutResult] = useState<WorkoutLogResponse | null>(null)
  const [workoutError, setWorkoutError] = useState<string | null>(null)
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLogResponse[]>([])
  const workoutFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMealHistory().then(r => setMealHistory(r.data)).catch(() => {})
    getWorkoutHistory().then(r => setWorkoutHistory(r.data)).catch(() => {})
  }, [])

  async function handleMealSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mealText.trim()) return
    setMealLoading(true); setMealError(null); setMealResult(null)
    try {
      const res = await logMeal({
        text: mealText.trim(),
        photos: mealPhotos.length ? mealPhotos : undefined,
        mealType: mealType ?? undefined,
        eatenAt: mealDate,
      })
      setMealResult(res.data)
      setMealHistory(prev => [res.data, ...prev])
      setMealText(''); setMealType(null); setMealDate(todayIso())
      setMealPhotos([]); setMealPhotoNames([])
      if (mealFileRef.current) mealFileRef.current.value = ''
    } catch {
      setMealError('Analyse fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setMealLoading(false)
    }
  }

  async function handleWorkoutSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWorkoutLoading(true); setWorkoutError(null); setWorkoutResult(null)
    try {
      const res = await logWorkout({
        type: workoutType,
        durationMinutes: workoutDuration ? parseInt(workoutDuration) : undefined,
        notes: workoutNotes.trim() || undefined,
        photos: workoutPhotos.length ? workoutPhotos : undefined,
        performedAt: workoutDate,
      })
      setWorkoutResult(res.data)
      setWorkoutHistory(prev => [res.data, ...prev])
      setWorkoutDuration(''); setWorkoutNotes(''); setWorkoutDate(todayIso())
      setWorkoutPhotos([]); setWorkoutPhotoNames([])
      if (workoutFileRef.current) workoutFileRef.current.value = ''
    } catch {
      setWorkoutError('Analyse fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setWorkoutLoading(false)
    }
  }

  async function handleMealFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setMealPhotos(await filesToPhotoDtos(files))
    setMealPhotoNames(files.map(f => f.name))
  }

  async function handleWorkoutFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setWorkoutPhotos(await filesToPhotoDtos(files))
    setWorkoutPhotoNames(files.map(f => f.name))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4 px-4">
      <h1 className="text-2xl font-bold text-neutral-900">Loggen</h1>

      <div className="flex bg-neutral-100 rounded-xl p-1">
        {(['meal', 'workout'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
            }`}>
            {t === 'meal' ? 'Mahlzeit' : 'Training'}
          </button>
        ))}
      </div>

      {/* ── Mahlzeit-Tab ── */}
      {tab === 'meal' && (
        <>
          <form onSubmit={handleMealSubmit} className="space-y-4">
            <MealTypeChips value={mealType} onChange={setMealType} />

            <Textarea value={mealText} onChange={e => setMealText(e.target.value)}
              placeholder="z. B. Zwei Scheiben Vollkornbrot mit Erdnussbutter und einer Banane…"
              rows={4} className="resize-none" disabled={mealLoading} />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-500">Datum</label>
                <input type="date" value={mealDate} onChange={e => setMealDate(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input ref={mealFileRef} type="file" accept="image/*" multiple
                className="hidden" onChange={handleMealFiles} />
              <Button type="button" variant="outline" size="lg"
                onClick={() => mealFileRef.current?.click()} disabled={mealLoading}>
                <PhotoIcon />
                {mealPhotoNames.length > 0 ? `${mealPhotoNames.length} Foto(s) gewählt` : 'Foto hinzufügen'}
              </Button>
              <Button type="submit" size="lg" disabled={mealLoading || !mealText.trim()} className="ml-auto">
                {mealLoading ? <LoadingSpinner label="Analysiere…" /> : 'Analysieren'}
              </Button>
            </div>
          </form>

          {mealError && <ErrorBox message={mealError} />}
          {mealResult && (
            <div className="space-y-2">
              <SectionLabel>Analyse</SectionLabel>
              <MealAnalysisCard meal={mealResult} />
            </div>
          )}
          {mealHistory.length > 0 && (
            <div className="space-y-3">
              <SectionLabel>Verlauf ({mealHistory.length})</SectionLabel>
              <div className="space-y-2">
                {mealHistory.map(m => (
                  <MealHistoryItem key={m.id} meal={m}
                    onUpdated={updated => setMealHistory(prev =>
                      prev.map(x => x.id === updated.id ? updated : x))} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Training-Tab ── */}
      {tab === 'workout' && (
        <>
          <form onSubmit={handleWorkoutSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500">Sportart</label>
                <select value={workoutType} onChange={e => setWorkoutType(e.target.value as WorkoutType)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]">
                  <option value="running">Laufen</option>
                  <option value="crossfit">CrossFit</option>
                  <option value="cycling">Radfahren</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500">Dauer (Minuten)</label>
                <input type="number" min={1} value={workoutDuration}
                  onChange={e => setWorkoutDuration(e.target.value)}
                  placeholder="z. B. 45"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
              </div>
            </div>

            <Textarea value={workoutNotes} onChange={e => setWorkoutNotes(e.target.value)}
              placeholder="Optionale Notizen, z. B. Strecke, Intensität, Höhenmeter…"
              rows={3} className="resize-none" disabled={workoutLoading} />

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-neutral-500">Datum</label>
              <input type="date" value={workoutDate} onChange={e => setWorkoutDate(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input ref={workoutFileRef} type="file" accept="image/*" multiple
                className="hidden" onChange={handleWorkoutFiles} />
              <Button type="button" variant="outline" size="lg"
                onClick={() => workoutFileRef.current?.click()} disabled={workoutLoading}>
                <PhotoIcon />
                {workoutPhotoNames.length > 0 ? `${workoutPhotoNames.length} Screenshot(s) gewählt` : 'Garmin Screenshot'}
              </Button>
              <Button type="submit" size="lg" disabled={workoutLoading} className="ml-auto">
                {workoutLoading ? <LoadingSpinner label="Analysiere…" /> : 'Analysieren'}
              </Button>
            </div>
          </form>

          {workoutError && <ErrorBox message={workoutError} />}
          {workoutResult && (
            <div className="space-y-2">
              <SectionLabel>Analyse</SectionLabel>
              <WorkoutAnalysisCard workout={workoutResult} />
            </div>
          )}
          {workoutHistory.length > 0 && (
            <div className="space-y-3">
              <SectionLabel>Verlauf ({workoutHistory.length})</SectionLabel>
              <div className="space-y-2">
                {workoutHistory.map(w => (
                  <WorkoutHistoryItem key={w.id} workout={w}
                    onUpdated={updated => setWorkoutHistory(prev =>
                      prev.map(x => x.id === updated.id ? updated : x))} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PhotoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">{children}</h2>
}

function ErrorBox({ message }: { message: string }) {
  return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{message}</div>
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {label}
    </span>
  )
}
