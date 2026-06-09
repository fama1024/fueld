import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  getPantryItems, addPantryItems, deletePantryItem,
  extractPantryFromPhoto, analyzePantry,
  type PantryItem, type PantryAnalysis,
} from './pantryApi'
import { quickLogMeal } from '@/features/meals/mealApi'

// ─── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map(n => (
        <svg key={n} className={`w-3.5 h-3.5 ${n <= count ? 'text-amber-400' : 'text-neutral-200'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

// ─── Recipe card ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: PantryAnalysis['recipes'][number] }) {
  const [open, setOpen] = useState(false)
  const [logging, setLogging] = useState(false)
  const [logged, setLogged] = useState(false)

  async function handleLog() {
    setLogging(true)
    try {
      await quickLogMeal({
        text: recipe.name,
        summary: recipe.ingredients.join(', '),
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
      })
      setLogged(true)
      setTimeout(() => setLogged(false), 3000)
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors">
        <div>
          <p className="text-sm font-medium text-neutral-800">{recipe.name}</p>
          {recipe.goalFit && (
            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{recipe.goalFit}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {recipe.calories != null && (
            <span className="text-xs font-semibold text-neutral-500">{recipe.calories} kcal</span>
          )}
          <svg className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-neutral-100">
          {recipe.ingredients.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Zutaten</p>
              <ul className="space-y-0.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-neutral-700 flex items-start gap-2">
                    <span className="text-neutral-300 mt-0.5">·</span>{ing}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recipe.steps && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Zubereitung</p>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{recipe.steps}</p>
            </div>
          )}
          {(recipe.protein != null || recipe.carbs != null || recipe.fat != null) && (
            <div className="flex gap-3 pt-1">
              {recipe.protein != null && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-1">
                  P: {recipe.protein}g
                </span>
              )}
              {recipe.carbs != null && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-lg px-2 py-1">
                  K: {recipe.carbs}g
                </span>
              )}
              {recipe.fat != null && (
                <span className="text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-lg px-2 py-1">
                  F: {recipe.fat}g
                </span>
              )}
            </div>
          )}
          {recipe.goalFit && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {recipe.goalFit}
            </p>
          )}
          <button
            onClick={handleLog}
            disabled={logging || logged}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
              logged
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50'
            }`}
          >
            {logged ? 'Geloggt ✓' : logging ? 'Wird geloggt…' : 'Als Mahlzeit loggen'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [analysis, setAnalysisState] = useState<PantryAnalysis | null>(() => {
    try {
      const stored = sessionStorage.getItem('pantry_analysis')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  function setAnalysis(value: PantryAnalysis | null) {
    setAnalysisState(value)
    if (value) sessionStorage.setItem('pantry_analysis', JSON.stringify(value))
    else sessionStorage.removeItem('pantry_analysis')
  }
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisNote, setAnalysisNote] = useState('')

  // Text add
  const [textInput, setTextInput] = useState('')
  const [addingText, setAddingText] = useState(false)

  // Photo extraction flow
  const [extracting, setExtracting] = useState(false)
  const [extractedItems, setExtractedItems] = useState<string[] | null>(null)
  const [extractedSelected, setExtractedSelected] = useState<string[]>([])
  const [savingExtracted, setSavingExtracted] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPantryItems()
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAddText() {
    const names = textInput.split(',').map(s => s.trim()).filter(Boolean)
    if (!names.length) return
    setAddingText(true)
    try {
      const res = await addPantryItems(names.map(name => ({ name })))
      setItems(prev => [...res.data, ...prev])
      setTextInput('')
    } finally {
      setAddingText(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    setExtractedItems(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const [, data] = (reader.result as string).split(',')
          resolve(data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await extractPantryFromPhoto(base64, file.type)
      setExtractedItems(res.data)
      setExtractedSelected(res.data)
    } catch {
      setExtractedItems([])
    } finally {
      setExtracting(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  async function handleSaveExtracted() {
    if (!extractedSelected.length) return
    setSavingExtracted(true)
    try {
      const res = await addPantryItems(extractedSelected.map(name => ({ name })))
      setItems(prev => [...res.data, ...prev])
      setExtractedItems(null)
      setExtractedSelected([])
    } finally {
      setSavingExtracted(false)
    }
  }

  async function handleDelete(id: string) {
    await deletePantryItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await analyzePantry(analysisNote.trim() || undefined)
      setAnalysis(res.data)
    } catch {
      setAnalysisError('Analyse fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Vorrat</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {items.length > 0 ? `${items.length} Zutat${items.length !== 1 ? 'en' : ''}` : 'Noch leer'}
          </p>
        </div>
        {items.length > 0 && (
          <Button onClick={handleAnalyze} disabled={analyzing} className="shrink-0">
            {analyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analysiere…
              </span>
            ) : 'Analysieren'}
          </Button>
        )}
      </div>

      {/* Analyse-Kontext */}
      {items.length > 0 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={analysisNote}
            onChange={e => setAnalysisNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !analyzing && handleAnalyze()}
            placeholder="z. B. ich bin krank, was empfiehlst du?"
            disabled={analyzing}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] placeholder:text-neutral-400"
          />
        </div>
      )}

      {/* Hinzufügen */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Zutaten hinzufügen</p>

        {/* Text input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddText()}
            placeholder="Kichererbsen, Spinat, Tofu…"
            disabled={addingText}
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
          <Button onClick={handleAddText} disabled={addingText || !textInput.trim()} variant="outline">
            Hinzufügen
          </Button>
        </div>

        {/* Photo upload */}
        <div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => photoRef.current?.click()}
            disabled={extracting}
          >
            {extracting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                KI liest Zutaten…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Kühlschrank / Regal fotografieren
              </span>
            )}
          </Button>
        </div>

        {/* Extraction result */}
        {extractedItems !== null && (
          <div className="space-y-3 pt-1 border-t border-neutral-100">
            <p className="text-xs text-neutral-500">
              {extractedItems.length > 0
                ? 'Erkannte Zutaten — abwählen was nicht passt:'
                : 'Keine Zutaten erkannt. Versuche ein deutlicheres Foto.'}
            </p>
            {extractedItems.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {extractedItems.map(item => {
                    const selected = extractedSelected.includes(item)
                    return (
                      <button key={item} type="button"
                        onClick={() => setExtractedSelected(prev =>
                          selected ? prev.filter(i => i !== item) : [...prev, item]
                        )}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-[#16A34A] text-white border-[#16A34A]'
                            : 'bg-white text-neutral-400 border-neutral-200 line-through'
                        }`}>
                        {item}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Button size="lg" onClick={handleSaveExtracted}
                    disabled={savingExtracted || !extractedSelected.length}>
                    {savingExtracted ? 'Speichere…' : `${extractedSelected.length} Zutaten speichern`}
                  </Button>
                  <button onClick={() => { setExtractedItems(null); setExtractedSelected([]) }}
                    className="text-sm text-neutral-400 hover:text-neutral-600">
                    Abbrechen
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Vorratsliste */}
      {loading ? (
        <div className="text-sm text-neutral-400">Lade…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-neutral-400">Noch keine Zutaten im Vorrat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Im Vorrat</h2>
          <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 overflow-hidden">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{item.name}</p>
                  {item.quantity && (
                    <p className="text-xs text-neutral-400">{item.quantity}</p>
                  )}
                </div>
                <button onClick={() => handleDelete(item.id)}
                  className="text-neutral-300 hover:text-red-400 transition-colors ml-4 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyse-Ergebnis */}
      {analysisError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{analysisError}</div>
      )}

      {analysis && (
        <div className="space-y-5">
          {/* Zutaten-Bewertung */}
          {analysis.ingredientRatings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Zutaten-Bewertung</h2>
              <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 overflow-hidden">
                {analysis.ingredientRatings.map((rating, i) => (
                  <div key={i} className="px-4 py-3 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-neutral-800">{rating.name}</p>
                      <Stars count={rating.stars} />
                    </div>
                    {rating.reason && (
                      <p className="text-xs text-neutral-500">{rating.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rezeptvorschläge */}
          {analysis.recipes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Rezeptvorschläge</h2>
              <div className="space-y-2">
                {analysis.recipes.map((recipe, i) => (
                  <RecipeCard key={i} recipe={recipe} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
