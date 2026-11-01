import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import LoadFailed from '@/components/LoadFailed'
import LogRow from '@/components/LogRow'
import RatingBar from '@/components/RatingBar'
import ClarifySheet from '@/features/log/ClarifySheet'
import { mealMeta, mealTitle } from '@/features/log/labels'
import { useLog } from '@/features/log/LogContext'
import { dayTotals, dominantRating, groupByDay, MIN_RATED_MEALS, quickMeals, ratingCounts } from '@/features/log/stats'
import { useQuickEntry } from '@/features/log/useQuickEntry'
import { getMealHistory, type MealLogResponse } from '@/features/meals/mealApi'
import { getSavedMeals, type SavedMeal } from '@/features/meals/savedMealApi'
import { dateLabel } from '@/lib/date'

const PAGE_SIZE = 60

function totalsLabel(meals: MealLogResponse[]) {
  const { calories, protein } = dayTotals(meals)
  if (calories === 0 && protein === 0) return null
  return `${calories.toLocaleString('de-DE')} kcal · ${protein} g Protein`
}

export default function NutritionPage() {
  const { version, openEntry } = useLog()
  const entry = useQuickEntry()
  const [meals, setMeals] = useState<MealLogResponse[] | null>(null)
  const [saved, setSaved] = useState<SavedMeal[]>([])
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    getMealHistory()
      .then(res => { setMeals(res.data); setFailed(false) })
      .catch(() => setFailed(true))
    getSavedMeals().then(res => setSaved(res.data)).catch(() => {})
  }, [version, attempt])

  const counts = useMemo(() => ratingCounts(meals ?? []), [meals])
  const dominant = dominantRating(counts)
  const quick = useMemo(() => quickMeals(saved, meals ?? []), [saved, meals])
  const days = useMemo(() => groupByDay((meals ?? []).slice(0, visible), meal => meal.eatenAt), [meals, visible])

  // Rückfrage, weil Einträge sich nicht löschen lassen und ein Fehltipp sonst stehen bliebe.
  function reenter(meal: { label: string; text: string }) {
    if (window.confirm(`„${meal.label}“ für heute eintragen?`)) entry.submit(meal.text)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-semibold text-ink">Ernährung</h1>

      {failed && <LoadFailed onRetry={() => setAttempt(a => a + 1)} />}
      {!meals && !failed && <p className="text-body text-ink-muted">Lade deine Mahlzeiten…</p>}

      {meals && (
        <>
          <section aria-label="Passt zu deinem Ziel" className="flex flex-col gap-2">
            <h2 className="text-caption font-semibold text-ink-muted">Passt zu deinem Ziel, letzte 7 Tage</h2>
            {dominant.rated >= MIN_RATED_MEALS
              ? <RatingBar counts={counts} dominant={dominant} />
              : <p className="text-caption text-ink-muted">Noch zu wenige eingeordnete Mahlzeiten für eine Tendenz.</p>}
          </section>

          {quick.length > 0 && (
            <section aria-label="Schnell wieder eintragen" className="flex flex-col gap-2">
              <h2 className="text-caption font-semibold text-ink-muted">Schnell wieder eintragen</h2>
              <div className="flex flex-wrap gap-2">
                {quick.map(meal => (
                  <Chip key={meal.text} disabled={entry.saving} className="max-w-full" onClick={() => reenter(meal)}>
                    <span className="truncate">{meal.label}</span>
                  </Chip>
                ))}
              </div>
              {(entry.saving || entry.notice) && (
                <p aria-live="polite" className="text-caption text-ink-muted">{entry.saving ? 'Wird eingeordnet…' : entry.notice}</p>
              )}
            </section>
          )}

          {meals.length === 0 && <p className="text-body text-ink-muted">Noch nichts eingetragen. Was gab’s heute?</p>}

          {days.map(([day, dayMeals]) => (
            <section key={day} aria-label={dateLabel(day)} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-caption font-semibold text-ink-muted">{dateLabel(day)}</h2>
                <span className="text-caption text-ink-muted">{totalsLabel(dayMeals)}</span>
              </div>
              {dayMeals.map(meal => (
                <LogRow key={meal.id} kind="meal" title={mealTitle(meal)} meta={mealMeta(meal)} rating={meal.goalRating}
                  onClick={() => openEntry({ kind: 'meal', meal })} />
              ))}
            </section>
          ))}

          {meals.length > visible && (
            <Button block variant="secondary" onClick={() => setVisible(v => v + PAGE_SIZE)}>Ältere Mahlzeiten laden</Button>
          )}
        </>
      )}

      {entry.drafts && <ClarifySheet drafts={entry.drafts} onSave={entry.save} onClose={entry.cancel} />}
    </div>
  )
}
