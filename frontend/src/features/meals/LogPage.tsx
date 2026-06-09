import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { logMeal, getMealHistory, type MealLogResponse, type PhotoDto } from './mealApi'

function MacroCard({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-xl p-4 gap-1">
      <span className="text-2xl font-bold text-neutral-900">{value ?? '–'}</span>
      <span className="text-xs text-neutral-500 uppercase tracking-wide">{unit}</span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  )
}

function AnalysisCard({ meal }: { meal: MealLogResponse }) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 space-y-4">
      {meal.summary && (
        <p className="text-sm font-medium text-neutral-700">{meal.summary}</p>
      )}

      <div className="grid grid-cols-4 gap-2">
        <MacroCard label="Kalorien" value={meal.calories} unit="kcal" />
        <MacroCard label="Protein" value={meal.protein} unit="g" />
        <MacroCard label="Kohlenhydrate" value={meal.carbs} unit="g" />
        <MacroCard label="Fett" value={meal.fat} unit="g" />
      </div>

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
    </div>
  )
}

function HistoryItem({ meal }: { meal: MealLogResponse }) {
  const [open, setOpen] = useState(false)
  const date = new Date(meal.loggedAt).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-medium text-neutral-800 line-clamp-1">{meal.textInput}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {meal.calories != null && (
            <span className="text-sm font-semibold text-neutral-600">{meal.calories} kcal</span>
          )}
          <svg
            className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <AnalysisCard meal={meal} />
        </div>
      )}
    </div>
  )
}

export default function LogPage() {
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<PhotoDto[]>([])
  const [photoNames, setPhotoNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MealLogResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<MealLogResponse[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMealHistory()
      .then(r => setHistory(r.data))
      .catch(() => {})
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const converted = await Promise.all(
      files.map(
        file =>
          new Promise<PhotoDto>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = reader.result as string
              // dataUrl = "data:image/jpeg;base64,<data>"
              const [meta, data] = dataUrl.split(',')
              const mediaType = meta.replace('data:', '').replace(';base64', '')
              resolve({ data, mediaType })
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
      )
    )

    setPhotos(converted)
    setPhotoNames(files.map(f => f.name))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await logMeal({ text: text.trim(), photos: photos.length ? photos : undefined })
      setResult(res.data)
      setHistory(prev => [res.data, ...prev])
      setText('')
      setPhotos([])
      setPhotoNames([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setError('Analyse fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mahlzeit erfassen</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Beschreibe deine Mahlzeit — die KI analysiert Makros und gibt dir Feedback.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="z. B. Zwei Scheiben Vollkornbrot mit Erdnussbutter und einer Banane…"
          rows={4}
          className="resize-none"
          disabled={loading}
        />

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            id="photo-upload"
          />
          <label htmlFor="photo-upload">
            <Button type="button" variant="outline" size="sm" asChild>
              <span className="cursor-pointer">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Foto hinzufügen
              </span>
            </Button>
          </label>

          {photoNames.length > 0 && (
            <span className="text-xs text-neutral-500 truncate max-w-[180px]">
              {photoNames.join(', ')}
            </span>
          )}

          <Button
            type="submit"
            disabled={loading || !text.trim()}
            className="ml-auto"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analysiere…
              </span>
            ) : (
              'Analysieren'
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Analyse</h2>
          <AnalysisCard meal={result} />
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
            Verlauf ({history.length})
          </h2>
          <div className="space-y-2">
            {history.map(m => (
              <HistoryItem key={m.id} meal={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
