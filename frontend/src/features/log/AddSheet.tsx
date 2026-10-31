import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import Field, { TextArea } from '@/components/Field'
import Segmented from '@/components/Segmented'
import Sheet from '@/components/Sheet'
import { logMeal, quickLogMeal, type MealType, type PhotoDto } from '@/features/meals/mealApi'
import { deleteSavedMeal, getSavedMeals, logMealFromSaved, type SavedMeal } from '@/features/meals/savedMealApi'
import { logWorkout, quickLogWorkout, type WorkoutType } from '@/features/workouts/workoutApi'
import { todayIso } from '@/lib/date'
import { MEAL_TYPES, WORKOUT_TYPES, mealTypeForNow } from './labels'
import { useLog } from './LogContext'
import PhotoPicker from './PhotoPicker'

const KINDS = [
  { value: 'meal', label: 'Mahlzeit' },
  { value: 'workout', label: 'Training' },
] as const

const toInt = (value: string) => (value ? parseInt(value) : undefined)
const toFloat = (value: string) => (value ? parseFloat(value) : undefined)

function MealForm({ initialText, onDone }: { initialText: string; onDone: () => void }) {
  const [mealType, setMealType] = useState<MealType | null>(mealTypeForNow)
  const [text, setText] = useState(initialText)
  const [date, setDate] = useState(todayIso)
  const [photos, setPhotos] = useState<PhotoDto[]>([])
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [picked, setPicked] = useState<SavedMeal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialText
    ? 'Die Einordnung hat gerade nicht geklappt. Versuch es nochmal oder speichere ohne Einordnung.'
    : '')

  useEffect(() => {
    getSavedMeals().then(res => setSavedMeals(res.data)).catch(() => {})
  }, [])

  async function run(action: () => Promise<unknown>, failure: string) {
    setLoading(true)
    setError('')
    try {
      await action()
      onDone()
    } catch {
      setError(failure)
    } finally {
      setLoading(false)
    }
  }

  const analyze = () => run(
    () => logMeal({ text: text.trim(), photos: photos.length ? photos : undefined, mealType, eatenAt: date }),
    'Die Einordnung hat gerade nicht geklappt. Versuch es nochmal oder speichere ohne Einordnung.',
  )
  const saveWithoutAnalysis = () => run(
    () => quickLogMeal({ text: text.trim(), calories: toInt(calories), protein: toInt(protein), carbs: toInt(carbs), fat: toInt(fat), mealType }),
    'Das hat gerade nicht geklappt. Nochmal versuchen?',
  )
  const logPicked = () => run(
    () => logMealFromSaved(picked!.id, { mealType, eatenAt: date }),
    'Das hat gerade nicht geklappt. Nochmal versuchen?',
  )

  function removeSaved(id: string) {
    setSavedMeals(prev => prev.filter(meal => meal.id !== id))
    deleteSavedMeal(id).catch(() => { /* Liste wird beim nächsten Öffnen neu geladen */ })
  }

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
      <Field label="Datum" type="date" value={date} onChange={e => setDate(e.target.value)} />

      {picked ? (
        <div className="rounded-md bg-surface-1 p-3">
          <p className="text-body font-semibold text-ink">{picked.name}</p>
          <p className="mt-1 text-caption text-ink-muted">Wird frisch eingeordnet, damit dein heutiger Tag mit einfließt.</p>
          <button type="button" onClick={() => setPicked(null)} className="mt-2 min-h-9 text-caption font-semibold text-lime">Andere Mahlzeit</button>
        </div>
      ) : (
        <>
          <TextArea label="Was gab’s?" value={text} onChange={e => setText(e.target.value)} rows={2}
            placeholder="Nudeln mit Tomatensauce" />
          <PhotoPicker onChange={setPhotos} disabled={loading} />

          {savedMeals.length > 0 && (
            <details className="rounded-md bg-surface-1">
              <summary className="flex min-h-tap cursor-pointer items-center px-3 text-caption font-semibold text-ink-soft">
                Gespeicherte Mahlzeiten ({savedMeals.length})
              </summary>
              <div className="flex flex-col px-3 pb-2">
                {savedMeals.map(meal => (
                  <div key={meal.id} className="flex items-center gap-2 border-t border-hairline">
                    <button type="button" onClick={() => { setPicked(meal); setError('') }}
                      className="min-h-tap min-w-0 flex-1 truncate text-left text-body text-ink">
                      {meal.name}
                    </button>
                    <button type="button" aria-label={`${meal.name} löschen`} onClick={() => removeSaved(meal.id)}
                      className="grid size-tap place-items-center text-ink-muted">
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}

          <details className="rounded-md bg-surface-1">
            <summary className="flex min-h-tap cursor-pointer items-center px-3 text-caption font-semibold text-ink-soft">
              Werte selbst eintragen
            </summary>
            <div className="grid grid-cols-2 gap-2 px-3 pb-3">
              <Field label="Kalorien" type="number" inputMode="numeric" value={calories} onChange={e => setCalories(e.target.value)} />
              <Field label="Protein in g" type="number" inputMode="numeric" value={protein} onChange={e => setProtein(e.target.value)} />
              <Field label="Kohlenhydrate in g" type="number" inputMode="numeric" value={carbs} onChange={e => setCarbs(e.target.value)} />
              <Field label="Fett in g" type="number" inputMode="numeric" value={fat} onChange={e => setFat(e.target.value)} />
            </div>
          </details>
        </>
      )}

      {error && <p className="text-caption text-danger">{error}</p>}

      {picked ? (
        <Button block disabled={loading} onClick={logPicked}>{loading ? 'Wird eingeordnet…' : 'Eintragen'}</Button>
      ) : (
        <>
          <Button block disabled={loading || !text.trim()} onClick={analyze}>{loading ? 'Wird eingeordnet…' : 'Eintragen'}</Button>
          <Button block variant="ghost" disabled={loading || !text.trim()} onClick={saveWithoutAnalysis}
            className="disabled:bg-transparent">
            Ohne Einordnung speichern
          </Button>
        </>
      )}
    </>
  )
}

function WorkoutForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<WorkoutType>('crossfit')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(todayIso)
  const [photos, setPhotos] = useState<PhotoDto[]>([])
  const [distance, setDistance] = useState('')
  const [pace, setPace] = useState('')
  const [avgHeartRate, setAvgHeartRate] = useState('')
  const [maxHeartRate, setMaxHeartRate] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<unknown>, failure: string) {
    setLoading(true)
    setError('')
    try {
      await action()
      onDone()
    } catch {
      setError(failure)
    } finally {
      setLoading(false)
    }
  }

  const base = { type, durationMinutes: toInt(duration), notes: notes.trim() || undefined, performedAt: date }
  const analyze = () => run(
    () => logWorkout({ ...base, photos: photos.length ? photos : undefined }),
    'Die Einordnung hat gerade nicht geklappt. Versuch es nochmal oder speichere ohne Einordnung.',
  )
  const saveWithoutAnalysis = () => run(
    () => quickLogWorkout({
      ...base,
      distanceKm: toFloat(distance),
      pacePerKm: pace.trim() || undefined,
      avgHeartRate: toInt(avgHeartRate),
      maxHeartRate: toInt(maxHeartRate),
      caloriesBurned: toInt(caloriesBurned),
    }),
    'Das hat gerade nicht geklappt. Nochmal versuchen?',
  )

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
      <TextArea label="Notiz" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Wie lief’s?" />
      <PhotoPicker onChange={setPhotos} disabled={loading} />

      <details className="rounded-md bg-surface-1">
        <summary className="flex min-h-tap cursor-pointer items-center px-3 text-caption font-semibold text-ink-soft">
          Werte selbst eintragen
        </summary>
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <Field label="Distanz in km" type="number" inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} />
          <Field label="Pace in min/km" value={pace} onChange={e => setPace(e.target.value)} placeholder="5:30" />
          <Field label="Ø Puls" type="number" inputMode="numeric" value={avgHeartRate} onChange={e => setAvgHeartRate(e.target.value)} />
          <Field label="Max. Puls" type="number" inputMode="numeric" value={maxHeartRate} onChange={e => setMaxHeartRate(e.target.value)} />
          <Field label="Kalorien" type="number" inputMode="numeric" value={caloriesBurned} onChange={e => setCaloriesBurned(e.target.value)} />
        </div>
      </details>

      {error && <p className="text-caption text-danger">{error}</p>}

      <Button block disabled={loading} onClick={analyze}>{loading ? 'Wird eingeordnet…' : 'Eintragen'}</Button>
      <Button block variant="ghost" disabled={loading} onClick={saveWithoutAnalysis} className="disabled:bg-transparent">
        Ohne Einordnung speichern
      </Button>
    </>
  )
}

export default function AddSheet({ initialText, onClose }: { initialText: string; onClose: () => void }) {
  const { changed } = useLog()
  const [kind, setKind] = useState<'meal' | 'workout'>('meal')

  function done() {
    changed()
    onClose()
  }

  return (
    <Sheet title="Eintragen" onClose={onClose}>
      <Segmented label="Art des Eintrags" options={KINDS} value={kind} onChange={setKind} />
      {kind === 'meal' ? <MealForm initialText={initialText} onDone={done} /> : <WorkoutForm onDone={done} />}
    </Sheet>
  )
}
