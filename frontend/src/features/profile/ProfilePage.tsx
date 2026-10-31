import { useEffect, useState } from 'react'
import { Check, LogOut, Trash2 } from 'lucide-react'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import Field, { TextArea } from '@/components/Field'
import MetricTile from '@/components/MetricTile'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import GarminCard from '@/features/garmin/GarminCard'
import ReminderSettings from '@/features/push/ReminderSettings'
import { logWeight, getWeightHistory, deleteWeight, type WeightEntry } from '@/features/weight/weightApi'
import { getProfile, saveProfile, type ActivityLevel, type Gender } from './profileApi'

const GOAL_TAGS = [
  'Muskelaufbau',
  'Gewicht verlieren',
  'Gewicht halten',
  'Ausdauer verbessern',
  'Mehr Energie im Alltag',
  'Besserer Schlaf',
]

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
  { value: 'diverse', label: 'Divers' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',         label: 'Kaum aktiv',    desc: 'Bürojob, wenig Bewegung' },
  { value: 'lightly_active',    label: 'Leicht aktiv',  desc: '1–3× Sport pro Woche' },
  { value: 'moderately_active', label: 'Moderat aktiv', desc: '3–5× Sport pro Woche' },
  { value: 'very_active',       label: 'Sehr aktiv',    desc: '6–7× Sport pro Woche' },
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

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gewichtsverlauf" className="w-full overflow-visible">
      <line x1={pL} x2={W - pR} y1={(pT + H - pB) / 2} y2={(pT + H - pB) / 2} stroke="var(--color-hairline)" strokeWidth={1} />
      <text x={pL - 4} y={yS(maxW) + 3} textAnchor="end" fontSize={9} fill="var(--color-ink-muted)">{maxW.toFixed(1)}</text>
      <text x={pL - 4} y={yS(minW) + 3} textAnchor="end" fontSize={9} fill="var(--color-ink-muted)">{minW.toFixed(1)}</text>
      <path d={line} fill="none" stroke="var(--color-lime)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill="var(--color-lime)" />)}
      <text x={xS(0)} y={H - 4} textAnchor="start" fontSize={9} fill="var(--color-ink-muted)">{fmt(recent[0].loggedAt)}</text>
      <text x={W - pR} y={H - 4} textAnchor="end" fontSize={9} fill="var(--color-ink-muted)">{fmt(recent[recent.length - 1].loggedAt)}</text>
    </svg>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <h2 className="text-heading font-semibold text-ink">{title}</h2>
      {children}
    </section>
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
  const [saveFailed, setSaveFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)

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

  async function handleDeleteWeight(id: string) {
    await deleteWeight(id)
    setWeightHistory(prev => prev.filter(e => e.id !== id))
  }

  async function handleSave() {
    setSaveFailed(false)
    try {
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
    } catch {
      setSaveFailed(true)
    }
  }

  const computed = calcGoals(bodyWeight, height, age, gender, activityLevel, goalTags)

  if (loading) return <p className="text-body text-ink-muted">Lade Profil…</p>

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-semibold text-ink">Profil</h1>

      {computed ? (
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Tagesziel" value={`${computed.targetCalories} kcal`} />
          <MetricTile label="Protein" value={`${computed.targetProtein} g`} />
        </div>
      ) : (
        <p className="rounded-md bg-surface-1 p-3 text-caption text-warning">
          Trag Körperdaten und Aktivität ein, dann wird dein Tagesziel berechnet.
        </p>
      )}

      <Card title="Ziele">
        <div className="flex flex-wrap gap-2">
          {GOAL_TAGS.map(tag => (
            <Chip key={tag} selected={goalTags.includes(tag)} onClick={() => setGoalTags(prev =>
              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            )}>
              {tag}
            </Chip>
          ))}
        </div>
        <TextArea label="In deinen Worten" value={goals} onChange={e => setGoals(e.target.value)} rows={3}
          placeholder="Was möchtest du erreichen?" />
      </Card>

      <Card title="Körperdaten">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Gewicht in kg" type="number" step="0.1" inputMode="decimal" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} />
          <Field label="Größe in cm" type="number" inputMode="numeric" value={height} onChange={e => setHeight(e.target.value)} />
          <Field label="Alter" type="number" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map(({ value, label }) => (
            <Chip key={value} selected={gender === value} onClick={() => setGender(value)}>{label}</Chip>
          ))}
        </div>
      </Card>

      <Card title="Aktivität">
        <div className="flex flex-col gap-1">
          {ACTIVITY_OPTIONS.map(option => {
            const active = activityLevel === option.value
            return (
              <button key={option.value} type="button" aria-pressed={active} onClick={() => setActivityLevel(option.value)}
                className={cn('flex min-h-tap items-center justify-between gap-3 rounded-md px-3 py-2 text-left', active && 'bg-surface-2')}>
                <span>
                  <span className="block text-body font-semibold text-ink">{option.label}</span>
                  <span className="block text-caption text-ink-muted">{option.desc}</span>
                </span>
                {active && <Check size={18} className="shrink-0 text-lime" aria-hidden />}
              </button>
            )
          })}
        </div>
      </Card>

      <Card title="Lifestyle">
        <Field label="Ernährungsweise" value={diet} onChange={e => setDiet(e.target.value)} placeholder="vegan, vegetarisch, low carb" />
        <Field label="Sportarten" value={sports} onChange={e => setSports(e.target.value)} placeholder="Laufen, CrossFit, Radfahren" />
      </Card>

      {saveFailed && <p className="text-caption text-danger">Das hat gerade nicht geklappt. Nochmal versuchen?</p>}
      <Button block onClick={handleSave}>{saved ? 'Gespeichert' : 'Profil speichern'}</Button>

      <Card title="Gewicht">
        <div className="flex items-end gap-2">
          <Field label="Aktuelles Gewicht in kg" type="number" step="0.1" inputMode="decimal" value={newWeight}
            onChange={e => setNewWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogWeight()} />
          <Button variant="secondary" disabled={weightSaving || !newWeight} onClick={handleLogWeight} className="disabled:bg-surface-2">
            Eintragen
          </Button>
        </div>
        <WeightChart entries={weightHistory} />
        {weightHistory.length === 0 && <p className="text-caption text-ink-muted">Noch keine Einträge.</p>}
        <div className="flex flex-col">
          {weightHistory.slice(0, 5).map(entry => (
            <div key={entry.id} className="flex min-h-tap items-center justify-between gap-3 border-t border-hairline">
              <span className="text-body font-semibold text-ink">{Number(entry.weight).toFixed(1).replace('.', ',')} kg</span>
              <span className="flex items-center gap-1">
                <span className="text-caption text-ink-muted">
                  {new Date(entry.loggedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
                <button type="button" aria-label="Eintrag löschen" onClick={() => handleDeleteWeight(entry.id)}
                  className="grid size-tap place-items-center text-ink-muted">
                  <Trash2 size={18} aria-hidden />
                </button>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <GarminCard />
      <ReminderSettings />

      <Button block variant="ghost" onClick={logout}>
        <LogOut size={18} aria-hidden /> Abmelden
      </Button>
    </div>
  )
}
