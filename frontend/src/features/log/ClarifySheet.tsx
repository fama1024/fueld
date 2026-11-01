import { useState } from 'react'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import Sheet from '@/components/Sheet'
import type { MealType } from '@/features/meals/mealApi'
import { dateLabel } from '@/lib/date'
import type { EntryDraft } from './entryApi'
import { MEAL_TYPES } from './labels'

interface ClarifySheetProps {
  drafts: EntryDraft[]
  onSave: (drafts: EntryDraft[]) => Promise<void>
  onClose: () => void
}

/** Rückfrage, wenn die freie Eingabe Mahlzeiten enthält, die sich nicht sicher zuordnen lassen. */
export default function ClarifySheet({ drafts, onSave, onClose }: ClarifySheetProps) {
  const [answers, setAnswers] = useState<Record<number, MealType>>({})
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const open = drafts
    .map((draft, index) => ({ draft, index }))
    .filter(({ draft }) => draft.kind === 'meal' && !draft.mealType)
  const others = drafts.length - open.length
  const complete = open.every(({ index }) => answers[index])

  async function save() {
    setSaving(true)
    setFailed(false)
    try {
      await onSave(drafts.map((draft, index) => (answers[index] ? { ...draft, mealType: answers[index] } : draft)))
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <Sheet title="Kurze Rückfrage" onClose={onClose}>
      {others > 0 && (
        <p className="text-caption text-ink-muted">
          {others === 1 ? 'Ein Eintrag ist schon klar.' : `${others} Einträge sind schon klar.`} Noch nicht gespeichert.
        </p>
      )}
      {open.map(({ draft, index }) => (
        <div key={index} className="flex flex-col gap-2 rounded-md bg-surface-1 p-3">
          <p className="text-body font-semibold text-ink">{draft.summary || draft.text}</p>
          <p className="text-caption text-ink-muted">{dateLabel(draft.date)}. Welche Mahlzeit war das?</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map(type => (
              <Chip key={type.value} selected={answers[index] === type.value}
                onClick={() => setAnswers(prev => ({ ...prev, [index]: type.value }))}>
                {type.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}
      {failed && <p className="text-caption text-danger">Das hat gerade nicht geklappt. Nochmal versuchen?</p>}
      <Button block disabled={!complete || saving} onClick={save}>{saving ? 'Wird gespeichert…' : 'Eintragen'}</Button>
    </Sheet>
  )
}
