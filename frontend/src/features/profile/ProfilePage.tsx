import { useEffect, useState } from 'react'
import { getProfile, saveProfile, type Gender, type ActivityLevel } from './profileApi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male',    label: 'Männlich' },
  { value: 'female',  label: 'Weiblich' },
  { value: 'diverse', label: 'Divers' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',         label: 'Kaum aktiv',         desc: 'Bürojob, wenig Bewegung' },
  { value: 'lightly_active',    label: 'Leicht aktiv',       desc: '1–3× Sport/Woche' },
  { value: 'moderately_active', label: 'Moderat aktiv',      desc: '3–5× Sport/Woche' },
  { value: 'very_active',       label: 'Sehr aktiv',         desc: 'Täglich intensiv' },
  { value: 'extra_active',      label: 'Extrem aktiv',       desc: 'Profisport / Schwerstarbeit' },
]

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-[#16A34A] text-white border-[#16A34A]'
          : 'bg-white text-neutral-600 border-neutral-300 hover:border-[#16A34A]'
      }`}
    >
      {children}
    </button>
  )
}

export default function ProfilePage() {
  const [goals, setGoals] = useState('')
  const [diet, setDiet] = useState('')
  const [sports, setSports] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile().then((res) => {
      const p = res.data
      setGoals(p.goals ?? '')
      setDiet(p.diet ?? '')
      setSports(p.sports ?? '')
      setBodyWeight(p.bodyWeight?.toString() ?? '')
      setHeight(p.height?.toString() ?? '')
      setAge(p.age?.toString() ?? '')
      setGender(p.gender ?? null)
      setActivityLevel(p.activityLevel ?? null)
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await saveProfile({
      goals: goals || null,
      diet: diet || null,
      sports: sports || null,
      bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
      height: height ? parseInt(height) : null,
      age: age ? parseInt(age) : null,
      gender: gender,
      activityLevel: activityLevel,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="p-6 text-muted-foreground">Lade Profil...</div>

  return (
    <div className="p-6 space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Mein Profil</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ziele</label>
          <Textarea
            placeholder="z. B. Muskeln aufbauen, Bauchfett verlieren"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Ernährung</label>
          <Textarea
            placeholder="z. B. vegan, laktosefrei"
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Sportarten</label>
          <Textarea
            placeholder="z. B. Crossfit, Laufen, Gravel-Bike"
            value={sports}
            onChange={(e) => setSports(e.target.value)}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Gewicht (kg)</label>
            <input
              type="number"
              step="0.1"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Größe (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Alter</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Geschlecht */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Geschlecht</label>
          <p className="text-xs text-neutral-400">Wird für die Kalorienberechnung (Mifflin-St Jeor) verwendet.</p>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map(opt => (
              <Chip key={opt.value} active={gender === opt.value} onClick={() => setGender(opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Aktivitätslevel */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Aktivitätslevel</label>
          <p className="text-xs text-neutral-400">Wie viel bewegst du dich im Alltag und beim Sport?</p>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActivityLevel(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                  activityLevel === opt.value
                    ? 'bg-[#16A34A]/10 border-[#16A34A] text-[#16A34A]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <span className="font-medium text-sm">{opt.label}</span>
                <span className="text-xs text-neutral-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full">
          {saved ? 'Gespeichert ✓' : 'Speichern'}
        </Button>
      </form>
    </div>
  )
}
