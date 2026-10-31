import { useState } from 'react'
import { Bookmark, BookmarkCheck, Pencil } from 'lucide-react'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import Field, { TextArea } from '@/components/Field'
import GoalRating from '@/components/GoalRating'
import MetricTile from '@/components/MetricTile'
import Sheet from '@/components/Sheet'
import { updateMeal, type MealLogResponse, type MealType, type PhotoDto } from '@/features/meals/mealApi'
import { createSavedMeal } from '@/features/meals/savedMealApi'
import { updateWorkout, type WorkoutLogResponse, type WorkoutType } from '@/features/workouts/workoutApi'
import { dateKeyOf } from '@/lib/date'
import { MEAL_TYPES, WORKOUT_TYPES, mealTitle, workoutTitle } from './labels'
import { useLog, type LogEntry } from './LogContext'
import PhotoPicker from './PhotoPicker'

const FAILED = 'Das hat gerade nicht geklappt. Nochmal versuchen?'

function MealDetail({ initial }: { initial: MealLogResponse }) {
  const { changed } = useLog()
  const [meal, setMeal] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(initial.textInput)
  const [mealType, setMealType] = useState<MealType | null>(initial.mealType)
  const [date, setDate] = useState(dateKeyOf(initial.eatenAt))
  const [photos, setPhotos] = useState<PhotoDto[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bookmark, setBookmark] = useState<'idle' | 'naming' | 'saved'>('idle')
  const [bookmarkName, setBookmarkName] = useState('')

  async function save(request: Parameters<typeof updateMeal>[1]) {
    setBusy(true)
    setError('')
    try {
      const res = await updateMeal(meal.id, request)
      setMeal(res.data)
      setEditing(false)
      setPhotos([])
      changed()
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  async function handleBookmark() {
    if (!bookmarkName.trim()) return
    setBusy(true)
    setError('')
    try {
      await createSavedMeal({
        name: bookmarkName.trim(),
        textInput: meal.textInput,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
      })
      setBookmark('saved')
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map(type => (
            <Chip key={type.value} selected={mealType === type.value}
              onClick={() => setMealType(mealType === type.value ? null : type.value)}>
              {type.label}
            </Chip>
          ))}
        </div>
        <TextArea label="Was gab’s?" value={text} onChange={e => setText(e.target.value)} rows={3} disabled={busy} />
        <Field label="Datum" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <PhotoPicker onChange={setPhotos} disabled={busy} />
        {error && <p className="text-caption text-danger">{error}</p>}
        <Button block disabled={busy || !text.trim()}
          onClick={() => save({ text: text.trim(), photos: photos.length ? photos : undefined, mealType, eatenAt: date })}>
          {busy ? 'Wird eingeordnet…' : 'Neu einordnen'}
        </Button>
        <Button block variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
      </>
    )
  }

  const hasMacros = meal.calories != null
  return (
    <>
      <p className="text-body text-ink-soft">{meal.textInput}</p>
      {hasMacros && (
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Kalorien" value={`${meal.calories} kcal`} />
          {meal.protein != null && <MetricTile label="Protein" value={`${meal.protein} g`} />}
          {meal.carbs != null && <MetricTile label="Kohlenhydrate" value={`${meal.carbs} g`} />}
          {meal.fat != null && <MetricTile label="Fett" value={`${meal.fat} g`} />}
        </div>
      )}
      {meal.goalAlignment && (
        <div className="flex flex-col items-start gap-2 rounded-md bg-surface-1 p-3">
          <GoalRating rating={meal.goalRating} />
          <p className="text-body text-ink-soft">{meal.goalAlignment}</p>
        </div>
      )}
      {meal.feedback && <p className="text-body text-ink-soft">{meal.feedback}</p>}
      {meal.ingredientTips && meal.ingredientTips.length > 0 && (
        <div>
          <p className="mb-1 text-label font-medium text-ink-muted">Passt heute noch gut dazu</p>
          <ul className="flex flex-col gap-1 text-caption text-ink-soft">
            {meal.ingredientTips.map(tip => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
      )}
      {error && <p className="text-caption text-danger">{error}</p>}

      {!hasMacros && (
        <Button block disabled={busy}
          onClick={() => save({ text: meal.textInput, mealType: meal.mealType, eatenAt: dateKeyOf(meal.eatenAt) })}>
          {busy ? 'Wird eingeordnet…' : 'Einordnung starten'}
        </Button>
      )}

      {bookmark === 'naming' ? (
        <div className="flex items-end gap-2">
          <Field label="Name der Mahlzeit" value={bookmarkName} onChange={e => setBookmarkName(e.target.value)} disabled={busy} />
          <Button disabled={busy || !bookmarkName.trim()} onClick={handleBookmark}>Merken</Button>
        </div>
      ) : bookmark === 'saved' ? (
        <p className="flex min-h-tap items-center gap-2 text-caption font-semibold text-ink-soft">
          <BookmarkCheck size={18} aria-hidden /> Gemerkt
        </p>
      ) : hasMacros && (
        <Button block variant="secondary" onClick={() => { setBookmark('naming'); setBookmarkName(mealTitle(meal)) }}>
          <Bookmark size={18} aria-hidden /> Mahlzeit merken
        </Button>
      )}

      <Button block variant="ghost" onClick={() => setEditing(true)}>
        <Pencil size={18} aria-hidden /> Bearbeiten
      </Button>
    </>
  )
}

function WorkoutDetail({ initial }: { initial: WorkoutLogResponse }) {
  const { changed } = useLog()
  const [workout, setWorkout] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState<WorkoutType>(initial.type)
  const [duration, setDuration] = useState(initial.durationMinutes?.toString() ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [date, setDate] = useState(dateKeyOf(initial.performedAt))
  const [photos, setPhotos] = useState<PhotoDto[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(request: Parameters<typeof updateWorkout>[1]) {
    setBusy(true)
    setError('')
    try {
      const res = await updateWorkout(workout.id, request)
      setWorkout(res.data)
      setEditing(false)
      setPhotos([])
      changed()
    } catch {
      setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_TYPES.map(option => (
            <Chip key={option.value} selected={type === option.value} onClick={() => setType(option.value)}>{option.label}</Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Dauer in Minuten" type="number" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)} />
          <Field label="Datum" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <TextArea label="Notiz" value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={busy} />
        <PhotoPicker onChange={setPhotos} disabled={busy} />
        {error && <p className="text-caption text-danger">{error}</p>}
        <Button block disabled={busy} onClick={() => save({
          type,
          durationMinutes: duration ? parseInt(duration) : undefined,
          notes: notes.trim() || undefined,
          photos: photos.length ? photos : undefined,
          performedAt: date,
        })}>
          {busy ? 'Wird eingeordnet…' : 'Neu einordnen'}
        </Button>
        <Button block variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
      </>
    )
  }

  const metrics = [
    { label: 'Distanz', value: workout.distanceKm != null ? `${String(workout.distanceKm).replace('.', ',')} km` : null },
    { label: 'Dauer', value: workout.durationMinutes != null ? `${workout.durationMinutes} min` : null },
    { label: 'Pace', value: workout.pacePerKm ? `${workout.pacePerKm} min/km` : null },
    { label: 'Ø Puls', value: workout.avgHeartRate },
    { label: 'Max. Puls', value: workout.maxHeartRate },
    { label: 'Kalorien', value: workout.caloriesBurned != null ? `${workout.caloriesBurned} kcal` : null },
  ].filter(metric => metric.value != null)

  return (
    <>
      {workout.notes && <p className="text-body text-ink-soft">{workout.notes}</p>}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(metric => <MetricTile key={metric.label} label={metric.label} value={metric.value} />)}
        </div>
      )}
      {workout.summary && <p className="text-body text-ink-soft">{workout.summary}</p>}
      {workout.feedback && <p className="text-body text-ink-soft">{workout.feedback}</p>}
      {workout.missingData && workout.missingData.length > 0 && (
        <p className="rounded-md bg-surface-1 p-3 text-caption text-warning">{workout.missingData.join(' · ')}</p>
      )}
      {error && <p className="text-caption text-danger">{error}</p>}
      {workout.summary == null && (
        <Button block disabled={busy} onClick={() => save({
          type: workout.type,
          durationMinutes: workout.durationMinutes ?? undefined,
          notes: workout.notes ?? undefined,
          performedAt: dateKeyOf(workout.performedAt),
        })}>
          {busy ? 'Wird eingeordnet…' : 'Einordnung starten'}
        </Button>
      )}
      <Button block variant="ghost" onClick={() => setEditing(true)}>
        <Pencil size={18} aria-hidden /> Bearbeiten
      </Button>
    </>
  )
}

export default function EntrySheet({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  return entry.kind === 'meal' ? (
    <Sheet title={mealTitle(entry.meal)} onClose={onClose}><MealDetail initial={entry.meal} /></Sheet>
  ) : (
    <Sheet title={workoutTitle(entry.workout)} onClose={onClose}><WorkoutDetail initial={entry.workout} /></Sheet>
  )
}
