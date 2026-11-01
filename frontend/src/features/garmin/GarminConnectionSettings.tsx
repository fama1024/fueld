import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import Button from '@/components/Button'
import Field from '@/components/Field'
import Sheet from '@/components/Sheet'
import { getGarminStatus, removeGarminConnection, saveGarminConnection, type GarminStatusResponse } from './garminApi'

interface GarminSheetProps {
  status: GarminStatusResponse
  onChange: (status: GarminStatusResponse) => void
  onClose: () => void
}

function GarminSheet({ status, onChange, onClose }: GarminSheetProps) {
  const [email, setEmail] = useState(status.email ?? '')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<{ data: GarminStatusResponse }>) {
    setBusy(true)
    setError('')
    try {
      const { data } = await action()
      onChange(data)
      onClose()
    } catch (e) {
      setError(axios.isAxiosError(e) && e.response?.status === 400
        ? 'Garmin nimmt diesen Key nicht an. Prüf ihn bitte noch einmal.'
        : 'Das hat gerade nicht geklappt. Versuch es gleich nochmal.')
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    run(() => saveGarminConnection(email.trim(), apiKey.trim() || undefined))
  }

  function handleRemove() {
    if (window.confirm('Garmin-Verbindung entfernen? Deine Trainings bleiben erhalten.')) {
      run(removeGarminConnection)
    }
  }

  return (
    <Sheet title="Garmin API" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="E-Mail" type="email" required autoComplete="email" value={email}
          onChange={e => setEmail(e.target.value)} hint="Dein Garmin-Konto, nur zur Anzeige." />
        <Field
          label="API Key"
          type="password"
          required={!status.connected}
          autoComplete="new-password"
          placeholder={status.connected ? '••••••••••••' : undefined}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          error={error || undefined}
          hint={status.connected
            ? 'Leer lassen, um den bisherigen Key zu behalten.'
            : 'Findest du in Garmin Connect unter Personal API Key. Wird verschlüsselt gespeichert.'}
        />
        <Button block type="submit" disabled={busy}>{busy ? 'Wird geprüft…' : 'Speichern'}</Button>
        {status.connected && (
          <Button block variant="ghost" disabled={busy} onClick={handleRemove}>Verbindung entfernen</Button>
        )}
      </form>
    </Sheet>
  )
}

export default function GarminConnectionSettings() {
  const [status, setStatus] = useState<GarminStatusResponse | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getGarminStatus().then(res => setStatus(res.data)).catch(() => {})
  }, [])

  if (!status) return null

  return (
    <section aria-label="Garmin" className="flex flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <h2 className="text-heading font-semibold text-ink">Garmin</h2>
      <p className="text-caption text-ink-muted">
        {status.connected ? `Verbunden mit ${status.email}. Trainings lädst du im Tab Sport.` : 'Übernimmt deine Trainings automatisch von Garmin.'}
      </p>
      <Button block variant="secondary" onClick={() => setOpen(true)}>
        {status.connected ? 'Garmin API anpassen' : 'Garmin API eintragen'}
      </Button>
      {open && <GarminSheet status={status} onChange={setStatus} onClose={() => setOpen(false)} />}
    </section>
  )
}
