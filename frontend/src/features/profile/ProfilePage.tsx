import { useEffect, useState } from 'react'
import { getProfile, saveProfile } from './profileApi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function ProfilePage() {
  const [goals, setGoals] = useState('')
  const [diet, setDiet] = useState('')
  const [sports, setSports] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
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

        <Button type="submit" className="w-full">
          {saved ? 'Gespeichert ✓' : 'Speichern'}
        </Button>
      </form>
    </div>
  )
}
