import { useEffect, useState, useRef } from 'react'
import { Save, User, Trash2, Camera, Image, LogOut } from 'lucide-react'
import { getProfile, saveProfile, type Gender, type ActivityLevel } from './profileApi'
import { useAuth } from '@/context/AuthContext'
import { logWeight, getWeightHistory, deleteWeight, analyzeWeightScreenshot, type WeightEntry, type BodyCompositionResult } from '@/features/weight/weightApi'

const GOAL_TAGS = [
  'Muskelaufbau',
  'Gewicht verlieren',
  'Gewicht halten',
  'Ausdauer verbessern',
  'Mehr Energie im Alltag',
  'Besserer Schlaf',
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',         label: 'Kaum aktiv',    desc: 'Bürojob, wenig Bewegung' },
  { value: 'lightly_active',    label: 'Leicht aktiv',  desc: '1–3× Sport/Woche' },
  { value: 'moderately_active', label: 'Moderat aktiv', desc: '3–5× Sport/Woche' },
  { value: 'very_active',       label: 'Sehr aktiv',    desc: '6–7× Sport/Woche' },
  { value: 'extra_active',      label: 'Extrem aktiv',  desc: 'Täglich intensiv' },
]

const PAL: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
}


function calcGoals(weight: string, height: string, age: string, gender: Gender | null, activity: ActivityLevel | null, goalTags: string[]) {
  const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age)
  if (!w || !h || !a || !gender || !activity) return null
  const bmr = gender === 'male'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : gender === 'female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a - 78
  const tdee = bmr * PAL[activity]
  const hasMuscle = goalTags.includes('Muskelaufbau')
  const hasLose = goalTags.includes('Gewicht verlieren')
  const targetCalories = Math.round(hasMuscle ? tdee + 200 : hasLose ? tdee - 300 : tdee)
  const proteinPerKg = hasMuscle ? 2.0 : hasLose ? 1.8 : 1.4
  const targetProtein = Math.round(w * proteinPerKg)
  return { targetCalories, targetProtein }
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const recent = [...entries].slice(0, 20).reverse()
  if (recent.length < 2) return null

  const weights = recent.map(e => Number(e.weight))
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const pad = Math.max((maxW - minW) * 0.15, 0.5)

  const W = 300, H = 80
  const pL = 34, pR = 8, pT = 8, pB = 20

  const xS = (i: number) => pL + (i / (recent.length - 1)) * (W - pL - pR)
  const yS = (v: number) => pT + ((maxW + pad - v) / ((maxW + pad) - (minW - pad))) * (H - pT - pB)

  const pts = recent.map((e, i) => ({ x: xS(i), y: yS(Number(e.weight)) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${H - pB} L${pts[0].x},${H - pB} Z`

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
      <line x1={pL} x2={W - pR} y1={(pT + H - pB) / 2} y2={(pT + H - pB) / 2} stroke="#eef1ee" strokeWidth={1} />
      <text x={pL - 4} y={yS(maxW) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#a0b0a5' }}>{maxW.toFixed(1)}</text>
      <text x={pL - 4} y={yS(minW) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#a0b0a5' }}>{minW.toFixed(1)}</text>
      <path d={area} fill="#16A34A" opacity={0.08} />
      <path d={line} fill="none" stroke="#16A34A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill="#16A34A" />)}
      <text x={xS(0)} y={H - 4} textAnchor="start" style={{ fontSize: 8, fill: '#a0b0a5' }}>{fmt(recent[0].loggedAt)}</text>
      <text x={W - pR} y={H - 4} textAnchor="end" style={{ fontSize: 8, fill: '#a0b0a5' }}>{fmt(recent[recent.length - 1].loggedAt)}</text>
    </svg>
  )
}

export default function ProfilePage() {
  const { logout } = useAuth()
  const [goals, setGoals] = useState('')
  const [goalTags, setGoalTags] = useState<string[]>([])
  const [diet, setDiet] = useState('')
  const [sports, setSports] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)
  const [pendingAnalysis, setPendingAnalysis] = useState<Partial<BodyCompositionResult> | null>(null)
  const [analyzingScreenshot, setAnalyzingScreenshot] = useState(false)
  const weightCameraRef = useRef<HTMLInputElement>(null)
  const weightScreenshotRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getWeightHistory().then(r => setWeightHistory(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    getProfile().then((res) => {
      const p = res.data
      setGoals(p.goals ?? '')
      setGoalTags(p.goalTags ?? [])
      setDiet(p.diet ?? '')
      setSports(p.sports ?? '')
      setBodyWeight(p.bodyWeight?.toString() ?? '')
      setHeight(p.height?.toString() ?? '')
      setAge(p.age?.toString() ?? '')
      setGender(p.gender ?? null)
      setActivityLevel(p.activityLevel ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleLogWeight() {
    const w = parseFloat(newWeight)
    if (!w || w <= 0) return
    setWeightSaving(true)
    try {
      const res = await logWeight({ weight: w })
      setWeightHistory(prev => [res.data, ...prev])
      setNewWeight('')
    } finally {
      setWeightSaving(false)
    }
  }

  async function handleAnalyzeScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzingScreenshot(true)
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
      const res = await analyzeWeightScreenshot({ data: base64, mediaType: file.type || 'image/jpeg' })
      setPendingAnalysis(res.data)
    } finally {
      setAnalyzingScreenshot(false)
      e.target.value = ''
    }
  }

  async function handleConfirmAnalysis() {
    if (!pendingAnalysis?.weight) return
    setWeightSaving(true)
    try {
      const res = await logWeight({
        weight: pendingAnalysis.weight,
        bmi: pendingAnalysis.bmi ?? null,
        bodyFatPct: pendingAnalysis.bodyFatPct ?? null,
        muscleMassPct: pendingAnalysis.muscleMassPct ?? null,
        boneMassKg: pendingAnalysis.boneMassKg ?? null,
        waterPct: pendingAnalysis.waterPct ?? null,
      })
      setWeightHistory(prev => [res.data, ...prev])
      setPendingAnalysis(null)
    } finally {
      setWeightSaving(false)
    }
  }

  async function handleDeleteWeight(id: string) {
    await deleteWeight(id)
    setWeightHistory(prev => prev.filter(e => e.id !== id))
  }

  async function handleSave() {
    await saveProfile({
      goals: goals || null,
      goalTags: goalTags.length ? goalTags : null,
      diet: diet || null,
      sports: sports || null,
      bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
      height: height ? parseInt(height) : null,
      age: age ? parseInt(age) : null,
      gender,
      activityLevel,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const computed = calcGoals(bodyWeight, height, age, gender, activityLevel, goalTags)

  if (loading) return <div className="p-6 text-sm" style={{ color: '#5a6b5e' }}>Lade Profil…</div>

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ width: 48, height: 48, background: '#dcfce7' }}>
            <User size={24} color="#16A34A" />
          </div>
          <div className="flex-1">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111816' }}>Mein Profil</h1>
            <p style={{ fontSize: 13, color: '#5a6b5e' }}>Ziele & Körperdaten</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>

      {/* TDEE preview card */}
      {computed ? (
        <div className="mx-4 mb-4 rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803d 100%)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>Berechnetes Tagesziel</div>
          <div className="flex items-end gap-6">
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{computed.targetCalories}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>kcal / Tag</div>
            </div>
            <div className="pb-0.5">
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{computed.targetProtein}g</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Protein</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Mifflin-St Jeor × PAL-Faktor</div>
        </div>
      ) : (
        <div className="mx-4 mb-4 rounded-2xl p-4"
          style={{ background: '#eef1ee', border: '1px dashed rgba(0,0,0,0.12)' }}>
          <div style={{ fontSize: 13, color: '#5a6b5e' }}>
            Gewicht, Größe, Alter, Geschlecht und Aktivitätslevel eintragen → Tagesziel wird berechnet.
          </div>
        </div>
      )}

      {/* Goal tags */}
      <div className="px-4 mb-4">
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111816', marginBottom: 10 }}>Ziele</div>
        <div className="flex flex-wrap gap-2">
          {GOAL_TAGS.map(tag => {
            const active = goalTags.includes(tag)
            return (
              <button key={tag} onClick={() => setGoalTags(prev =>
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
              )}
                className="px-3 py-1.5 rounded-full"
                style={{
                  fontSize: 13, fontWeight: 600,
                  background: active ? '#16A34A' : '#eef1ee',
                  color: active ? '#fff' : '#5a6b5e',
                  transition: 'all 0.2s',
                }}>
                {active ? '✓ ' : ''}{tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body data */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4"
        style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111816', marginBottom: 12 }}>Körperdaten</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6b5e', display: 'block', marginBottom: 4 }}>Gewicht (kg)</label>
            <input type="number" step="0.1" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 15, color: '#111816', border: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6b5e', display: 'block', marginBottom: 4 }}>Größe (cm)</label>
            <input type="number" value={height} onChange={e => setHeight(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 15, color: '#111816', border: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6b5e', display: 'block', marginBottom: 4 }}>Alter</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none"
              style={{ background: '#f4f6f4', fontSize: 15, color: '#111816', border: 'none' }} />
          </div>
        </div>

        {/* Gender */}
        <div className="mt-3">
          <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6b5e', display: 'block', marginBottom: 6 }}>Geschlecht</label>
          <div className="flex gap-2">
            {([{ v: 'male', l: 'Männlich' }, { v: 'female', l: 'Weiblich' }, { v: 'diverse', l: 'Divers' }] as const).map(({ v, l }) => (
              <button key={v} onClick={() => setGender(v)}
                className="flex-1 py-2 rounded-xl"
                style={{ fontSize: 12, fontWeight: 600, background: gender === v ? '#16A34A' : '#f4f6f4', color: gender === v ? '#fff' : '#5a6b5e', transition: 'all 0.2s' }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Weight history */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4"
        style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111816', marginBottom: 12 }}>Gewichtsverlauf</div>

        <input ref={weightCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAnalyzeScreenshot} />
        <input ref={weightScreenshotRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAnalyzeScreenshot} />

        {pendingAnalysis ? (
          <div>
            <p style={{ fontSize: 12, color: '#5a6b5e', marginBottom: 10 }}>Extrahierte Werte prüfen und ggf. korrigieren:</p>
            <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {([
                { key: 'weight',        label: 'Gewicht',    unit: 'kg' },
                { key: 'bmi',           label: 'BMI',        unit: ''   },
                { key: 'bodyFatPct',    label: 'Körperfett', unit: '%'  },
                { key: 'muscleMassPct', label: 'Muskeln',    unit: '%'  },
                { key: 'boneMassKg',    label: 'Knochen',    unit: 'kg' },
                { key: 'waterPct',      label: 'Wasser',     unit: '%'  },
              ] as const).map(({ key, label, unit }) => (
                <div key={key}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#5a6b5e', display: 'block', marginBottom: 3 }}>
                    {label}{unit && ` (${unit})`}
                  </label>
                  <input
                    type="number" step="0.1"
                    value={pendingAnalysis[key] ?? ''}
                    onChange={e => setPendingAnalysis(prev => ({ ...prev, [key]: parseFloat(e.target.value) || null }))}
                    className="w-full px-2 py-1.5 rounded-lg outline-none"
                    style={{ background: '#f4f6f4', fontSize: 13, color: '#111816', border: 'none' }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirmAnalysis} disabled={weightSaving || !pendingAnalysis.weight}
                className="flex-1 py-2.5 rounded-xl text-white disabled:opacity-50"
                style={{ background: '#16A34A', fontSize: 13, fontWeight: 700 }}>
                {weightSaving ? '…' : 'Übernehmen'}
              </button>
              <button onClick={() => setPendingAnalysis(null)}
                className="px-4 py-2.5 rounded-xl"
                style={{ background: '#eef1ee', fontSize: 13, fontWeight: 600, color: '#5a6b5e' }}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              <input
                type="number" step="0.1" value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="z.B. 78.5"
                className="flex-1 px-3 py-2.5 rounded-xl outline-none"
                style={{ background: '#f4f6f4', fontSize: 15, color: '#111816', border: 'none' }}
                onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
              />
              <button onClick={handleLogWeight} disabled={weightSaving || !newWeight}
                className="px-4 py-2.5 rounded-xl text-white disabled:opacity-50"
                style={{ background: '#16A34A', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {weightSaving ? '…' : 'Eintragen'}
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <button onClick={() => weightCameraRef.current?.click()} disabled={analyzingScreenshot}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl disabled:opacity-60"
                style={{ background: '#eef1ee', fontSize: 12, fontWeight: 600, color: '#111816' }}>
                <Camera size={13} color="#16A34A" />
                {analyzingScreenshot ? 'Analysiere…' : 'Kamera'}
              </button>
              <button onClick={() => weightScreenshotRef.current?.click()} disabled={analyzingScreenshot}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl disabled:opacity-60"
                style={{ background: '#eef1ee', fontSize: 12, fontWeight: 600, color: '#111816' }}>
                <Image size={13} color="#16A34A" />
                {analyzingScreenshot ? 'Analysiere…' : 'Screenshot'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#a0b0a5', marginBottom: 12 }}>
              Xiaomi-App → Körperanalyse fotografieren → KI extrahiert alle Werte
            </p>
          </>
        )}

        {weightHistory.length >= 2 && (
          <div className="mb-3">
            <WeightChart entries={weightHistory} />
          </div>
        )}

        {weightHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: '#a0b0a5' }}>Noch keine Einträge.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {weightHistory.slice(0, 5).map(e => (
              <div key={e.id} className="px-3 py-2 rounded-xl" style={{ background: '#f4f6f4' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111816' }}>{Number(e.weight).toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: '#5a6b5e', marginLeft: 4 }}>kg</span>
                    {e.bmi != null && (
                      <span style={{ fontSize: 11, color: '#a0b0a5', marginLeft: 8 }}>BMI {Number(e.bmi).toFixed(1)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 11, color: '#a0b0a5' }}>
                      {new Date(e.loggedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    <button onClick={() => handleDeleteWeight(e.id)} style={{ color: '#d1d5db', padding: 2 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {(e.bodyFatPct != null || e.muscleMassPct != null || e.waterPct != null) && (
                  <div className="flex gap-3 mt-1">
                    {e.bodyFatPct != null && <span style={{ fontSize: 10, color: '#5a6b5e' }}>Fett {Number(e.bodyFatPct).toFixed(1)}%</span>}
                    {e.muscleMassPct != null && <span style={{ fontSize: 10, color: '#5a6b5e' }}>Muskeln {Number(e.muscleMassPct).toFixed(1)}%</span>}
                    {e.waterPct != null && <span style={{ fontSize: 10, color: '#5a6b5e' }}>Wasser {Number(e.waterPct).toFixed(1)}%</span>}
                  </div>
                )}
              </div>
            ))}
            {weightHistory.length > 5 && (
              <p style={{ fontSize: 11, color: '#a0b0a5', textAlign: 'center', marginTop: 2 }}>
                + {weightHistory.length - 5} weitere Einträge
              </p>
            )}
          </div>
        )}
      </div>

      {/* Activity level */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4"
        style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111816', marginBottom: 10 }}>Aktivitätslevel</div>
        <div className="flex flex-col gap-1.5">
          {ACTIVITY_OPTIONS.map(al => (
            <button key={al.value} onClick={() => setActivityLevel(al.value)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left"
              style={{ background: activityLevel === al.value ? '#dcfce7' : '#f4f6f4', transition: 'background 0.2s' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: activityLevel === al.value ? '#15803d' : '#111816' }}>{al.label}</div>
                <div style={{ fontSize: 11, color: '#5a6b5e' }}>{al.desc}</div>
              </div>
              {activityLevel === al.value && (
                <div className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 18, height: 18, background: '#16A34A' }}>
                  <span style={{ fontSize: 10, color: '#fff' }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lifestyle */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4"
        style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111816', marginBottom: 12 }}>Lifestyle</div>
        <div className="flex flex-col gap-3">
          {([
            { label: 'Ernährungsweise', value: diet, setter: setDiet, placeholder: 'z.B. vegan, vegetarisch, low carb…' },
            { label: 'Sportarten', value: sports, setter: setSports, placeholder: 'z.B. Laufen, Crossfit, Radfahren…' },
          ] as const).map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6b5e', display: 'block', marginBottom: 4 }}>{label}</label>
              <input type="text" value={value} onChange={e => (setter as (v: string) => void)(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl outline-none"
                style={{ background: '#f4f6f4', fontSize: 14, color: '#111816', border: 'none' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a6b5e', display: 'block', marginBottom: 4 }}>Ziele (Freitext)</label>
            <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={3}
              placeholder="Beschreibe deine Ziele genauer…"
              className="w-full px-3 py-2.5 rounded-xl outline-none resize-none"
              style={{ background: '#f4f6f4', fontSize: 14, color: '#111816', border: 'none', lineHeight: 1.5 }} />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="px-4">
        <button onClick={handleSave}
          className="w-full py-3.5 rounded-2xl text-white flex items-center justify-center gap-2"
          style={{ background: saved ? '#15803d' : '#16A34A', fontSize: 15, fontWeight: 700, transition: 'background 0.3s' }}>
          <Save size={16} />
          {saved ? 'Gespeichert ✓' : 'Profil speichern'}
        </button>
      </div>
    </div>
  )
}
