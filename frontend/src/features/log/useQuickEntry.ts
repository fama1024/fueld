import { useState } from 'react'
import { filesToPhotoDtos } from '@/lib/photos'
import { confirmEntries, parseEntry, type EntryDraft } from './entryApi'
import { useLog } from './LogContext'

function savedLabel(meals: number, workouts: number) {
  const parts = []
  if (meals > 0) parts.push(meals === 1 ? '1 Mahlzeit' : `${meals} Mahlzeiten`)
  if (workouts > 0) parts.push(workouts === 1 ? '1 Training' : `${workouts} Trainings`)
  return parts.join(' und ')
}

/** Freie Eingabe: erkennen, bei offenem Mahlzeit-Typ nachfragen, dann alles zusammen speichern. */
export function useQuickEntry() {
  const { changed } = useLog()
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<EntryDraft[] | null>(null)
  const [entryKey, setEntryKey] = useState(0)
  const [notice, setNotice] = useState('')

  async function save(items: EntryDraft[]) {
    const { data: saved } = await confirmEntries(items)
    setDrafts(null)
    setEntryKey(key => key + 1)
    setNotice(`${savedLabel(saved.meals, saved.workouts)} eingetragen.`)
    changed()
  }

  async function submit(text: string, files: File[] = []) {
    setSaving(true)
    setNotice('')
    try {
      const photos = files.length ? await filesToPhotoDtos(files) : undefined
      const { data } = await parseEntry(text, photos)
      if (data.items.length === 0) {
        setNotice(data.message || 'Das konnte ich nicht zuordnen. Beschreib es etwas genauer.')
      } else if (data.items.some(item => item.kind === 'meal' && !item.mealType)) {
        setDrafts(data.items)
      } else {
        await save(data.items)
      }
    } catch {
      // Text und Foto bleiben im Feld. Ein Formular wäre hier falsch: Es würde einen
      // ganzen Tag als eine einzige Mahlzeit speichern.
      setNotice('Das hat gerade nicht geklappt. Dein Text bleibt stehen, versuch es gleich nochmal.')
    } finally {
      setSaving(false)
    }
  }

  return { saving, drafts, entryKey, notice, submit, save, cancel: () => setDrafts(null) }
}
