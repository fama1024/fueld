import { useState, useEffect, useRef } from 'react'
import { Plus, Camera, Image, Trash2, ChefHat, Star, RefreshCw } from 'lucide-react'
import {
  getPantryItems, addPantryItems, deletePantryItem,
  extractPantryFromPhoto, analyzePantry,
  type PantryItem, type PantryAnalysis,
} from './pantryApi'
import { quickLogMeal } from '@/features/meals/mealApi'

function StarRating({ count }: { count: number }) {
  const colors: Record<number, string> = { 1: '#F97316', 2: '#EAB308', 3: '#16A34A' }
  const c = colors[count] ?? '#EAB308'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(s => (
        <Star key={s} size={12} fill={s <= count ? c : 'transparent'} color={s <= count ? c : '#d1d5d2'} />
      ))}
    </div>
  )
}

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
    } finally { setLogging(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #eef1ee' }}>
      <button className="w-full p-3 text-left" onClick={() => setOpen(v => !v)}>
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111816' }}>{recipe.name}</div>
            {recipe.goalFit && <div style={{ fontSize: 11, color: '#5a6b5e' }} className="truncate">{recipe.goalFit}</div>}
            <div style={{ fontSize: 11, color: '#a0b0a5' }} className="truncate">{recipe.ingredients.join(', ')}</div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            {recipe.calories != null && (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>{recipe.calories} kcal</div>
                <div style={{ fontSize: 10, color: '#5a6b5e' }}>P{recipe.protein}g · C{recipe.carbs}g · F{recipe.fat}g</div>
              </>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid #eef1ee' }}>
          {recipe.goalFit && (
            <div className="rounded-xl p-2 mt-3 mb-2" style={{ background: '#dcfce7' }}>
              <p style={{ fontSize: 11, color: '#15803d' }}>🎯 {recipe.goalFit}</p>
            </div>
          )}
          {recipe.steps && (
            <p style={{ fontSize: 12, color: '#5a6b5e', lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
              {recipe.steps}
            </p>
          )}
          <button onClick={handleLog} disabled={logging || logged}
            className="w-full py-2.5 rounded-xl text-white disabled:opacity-50"
            style={{ background: logged ? '#15803d' : '#16A34A', fontSize: 13, fontWeight: 600 }}>
            {logged ? 'Geloggt ✓' : logging ? 'Wird geloggt…' : 'Als Mahlzeit loggen'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [analysis, setAnalysisState] = useState<PantryAnalysis | null>(() => {
    try {
      const stored = sessionStorage.getItem('pantry_analysis')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
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
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newQty, setNewQty] = useState('')
  const [addingText, setAddingText] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractedItems, setExtractedItems] = useState<string[] | null>(null)
  const [extractedSelected, setExtractedSelected] = useState<string[]>([])
  const [savingExtracted, setSavingExtracted] = useState(false)

  const photoRef = useRef<HTMLInputElement>(null)
  const photoCameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPantryItems().then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleAddText() {
    if (!newItem.trim()) return
    setAddingText(true)
    try {
      const names = newItem.split(',').map(s => s.trim()).filter(Boolean)
      const res = await addPantryItems(names.map(name => ({ name, quantity: newQty.trim() || undefined })))
      setItems(prev => [...res.data, ...prev])
      setNewItem(''); setNewQty(''); setShowAdd(false)
    } finally { setAddingText(false) }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true); setExtractedItems(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => { const [, d] = (reader.result as string).split(','); resolve(d) }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await extractPantryFromPhoto(base64, file.type)
      setExtractedItems(res.data); setExtractedSelected(res.data)
    } catch { setExtractedItems([]) }
    finally {
      setExtracting(false)
      if (photoRef.current) photoRef.current.value = ''
      if (photoCameraRef.current) photoCameraRef.current.value = ''
    }
  }

  async function handleSaveExtracted() {
    if (!extractedSelected.length) return
    setSavingExtracted(true)
    try {
      const res = await addPantryItems(extractedSelected.map(name => ({ name })))
      setItems(prev => [...res.data, ...prev])
      setExtractedItems(null); setExtractedSelected([])
    } finally { setSavingExtracted(false) }
  }

  async function handleDelete(id: string) {
    await deletePantryItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleAnalyze() {
    setAnalyzing(true); setAnalysisError(null)
    try {
      const res = await analyzePantry(analysisNote.trim() || undefined)
      setAnalysis(res.data)
    } catch { setAnalysisError('Analyse fehlgeschlagen. Bitte erneut versuchen.') }
    finally { setAnalyzing(false) }
  }

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111816' }}>Vorratsschrank</h1>
        <p style={{ fontSize: 13, color: '#5a6b5e' }}>
          {items.length > 0 ? `${items.length} Zutat${items.length !== 1 ? 'en' : ''}` : 'Noch leer'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="px-4 flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ background: showAdd ? '#16A34A' : '#dcfce7', color: showAdd ? '#fff' : '#15803d', fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} /> Hinzufügen
        </button>
        <input ref={photoCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <button onClick={() => photoCameraRef.current?.click()} disabled={extracting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ background: '#eef1ee', color: '#111816', fontSize: 13, fontWeight: 600 }}>
          <Camera size={14} color="#16A34A" /> Foto
        </button>
        <button onClick={() => photoRef.current?.click()} disabled={extracting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ background: '#eef1ee', color: '#111816', fontSize: 13, fontWeight: 600 }}>
          <Image size={14} color="#16A34A" />
          {extracting ? 'Liest…' : 'Galerie'}
        </button>
        {items.length > 0 && (
          <button onClick={handleAnalyze} disabled={analyzing}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl disabled:opacity-60"
            style={{ background: analysis ? '#dcfce7' : '#eef1ee', color: analysis ? '#15803d' : '#111816', fontSize: 13, fontWeight: 600 }}>
            {analyzing
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />Analysiere…</>
              : <><ChefHat size={14} /> Analysieren</>}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mx-4 mb-4 bg-white rounded-2xl p-4"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex gap-2 mb-3">
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddText()}
              placeholder="Zutat (mehrere mit Komma)" disabled={addingText}
              className="flex-1 px-3 py-2.5 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
            <input value={newQty} onChange={e => setNewQty(e.target.value)}
              placeholder="Menge" disabled={addingText}
              className="w-20 px-3 py-2.5 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 14, border: 'none', color: '#111816' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddText} disabled={addingText || !newItem.trim()}
              className="flex-1 py-2.5 rounded-xl text-white disabled:opacity-50"
              style={{ background: '#16A34A', fontSize: 13, fontWeight: 600 }}>
              {addingText ? 'Speichere…' : 'Hinzufügen'}
            </button>
            <button onClick={() => { setShowAdd(false); setNewItem(''); setNewQty('') }}
              className="px-4 py-2.5 rounded-xl"
              style={{ background: '#eef1ee', fontSize: 13, color: '#5a6b5e' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Photo extraction confirm */}
      {extractedItems !== null && (
        <div className="mx-4 mb-4 bg-white rounded-2xl p-4"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111816', marginBottom: 10 }}>
            {extractedItems.length > 0 ? 'Erkannte Zutaten – abwählen was nicht passt:' : 'Keine Zutaten erkannt. Deutlicheres Foto versuchen.'}
          </div>
          {extractedItems.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {extractedItems.map(item => {
                  const sel = extractedSelected.includes(item)
                  return (
                    <button key={item} onClick={() => setExtractedSelected(prev =>
                      sel ? prev.filter(i => i !== item) : [...prev, item]
                    )}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: sel ? '#16A34A' : '#eef1ee', color: sel ? '#fff' : '#5a6b5e', textDecoration: sel ? 'none' : 'line-through' }}>
                      {item}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveExtracted} disabled={savingExtracted || !extractedSelected.length}
                  className="flex-1 py-2.5 rounded-xl text-white disabled:opacity-50"
                  style={{ background: '#16A34A', fontSize: 13, fontWeight: 600 }}>
                  {savingExtracted ? 'Speichere…' : `${extractedSelected.length} Zutaten speichern`}
                </button>
                <button onClick={() => { setExtractedItems(null); setExtractedSelected([]) }}
                  className="px-4 py-2.5 rounded-xl"
                  style={{ background: '#eef1ee', fontSize: 13, color: '#5a6b5e' }}>
                  Abbrechen
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Analysis context input */}
      {items.length > 0 && !analysis && (
        <div className="mx-4 mb-4 flex gap-2">
          <input type="text" value={analysisNote} onChange={e => setAnalysisNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !analyzing && handleAnalyze()}
            placeholder="Kontext-Hinweis z.B. 'heute Crossfit-Training, ich bin müde'"
            className="flex-1 px-3 py-2.5 rounded-xl outline-none"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', fontSize: 13, color: '#111816' }} />
        </div>
      )}

      {analysisError && (
        <div className="mx-4 mb-4 rounded-xl p-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ fontSize: 12, color: '#dc2626' }}>{analysisError}</p>
        </div>
      )}

      {/* Analysis results */}
      {analysis && (
        <div className="mx-4 mb-4 bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="p-4" style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803d 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat size={18} color="#fff" />
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>KI-Analyse deines Vorrats</h3>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Basierend auf heutiger Nährstoffbilanz + Zielen</p>
                </div>
              </div>
              <button onClick={() => setAnalysis(null)}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Verwerfen</button>
            </div>
          </div>

          {analysis.ingredientRatings.length > 0 && (
            <div className="p-4 pb-0">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5a6b5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bewertung</div>
              <div className="flex flex-col gap-2">
                {analysis.ingredientRatings.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl p-3"
                    style={{ background: '#f4f6f4' }}>
                    <div className="min-w-0">
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111816' }}>{r.name}</div>
                      {r.reason && <div style={{ fontSize: 11, color: '#5a6b5e' }} className="truncate">{r.reason}</div>}
                    </div>
                    <StarRating count={r.stars} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.recipes.length > 0 && (
            <div className="p-4">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5a6b5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rezeptvorschläge</div>
              <div className="flex flex-col gap-2">
                {analysis.recipes.map((r, i) => <RecipeCard key={i} recipe={r} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="px-4 text-sm" style={{ color: '#5a6b5e' }}>Lade…</div>
      ) : items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p style={{ fontSize: 14, color: '#5a6b5e' }}>Noch keine Zutaten im Vorrat.</p>
          <p style={{ fontSize: 12, color: '#a0b0a5', marginTop: 4 }}>Hinzufügen per Text oder Foto.</p>
        </div>
      ) : (
        <div className="px-4">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6b5e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {items.length} Zutat{items.length !== 1 ? 'en' : ''}
          </div>
          <div className="flex flex-col gap-2">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-3 flex items-center gap-3"
                style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111816' }}>{item.name}</div>
                  {item.quantity && <div style={{ fontSize: 12, color: '#5a6b5e' }}>{item.quantity}</div>}
                </div>
                <button onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ background: '#fff0f0' }}>
                  <Trash2 size={14} color="#dc2626" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
