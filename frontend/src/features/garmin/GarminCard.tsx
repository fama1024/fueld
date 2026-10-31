import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Button from '@/components/Button'
import { useLog } from '@/features/log/LogContext'
import { getGarminStatus, syncGarmin } from './garminApi'

const FULL_HISTORY_DAYS = 3650

export default function GarminCard() {
  const { changed } = useLog()
  const [enabled, setEnabled] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getGarminStatus().then(res => setEnabled(res.data.enabled)).catch(() => {})
  }, [])

  async function sync(days?: number) {
    setSyncing(true)
    setMessage(days ? 'Lade Garmin-Historie, das kann einen Moment dauern.' : '')
    try {
      const { data } = await syncGarmin(days)
      if (data.imported > 0) changed()
      setMessage(data.imported > 0
        ? `${data.imported} ${data.imported === 1 ? 'neues Training' : 'neue Trainings'} von Garmin geladen`
        : 'Nichts Neues von Garmin')
    } catch {
      setMessage('Garmin-Abruf hat nicht geklappt. Ist der API-Key noch gültig?')
    } finally {
      setSyncing(false)
    }
  }

  if (!enabled) return null

  return (
    <section aria-label="Garmin" className="flex flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <h2 className="text-heading font-semibold text-ink">Garmin</h2>
      <p className="text-caption text-ink-muted">Trainings werden täglich um 18:30 Uhr automatisch geladen.</p>
      <Button block variant="secondary" disabled={syncing} onClick={() => sync()} className="disabled:bg-surface-2">
        <RefreshCw size={18} className={syncing ? 'animate-spin' : undefined} aria-hidden />
        Jetzt laden
      </Button>
      {/* Einmalig gedacht: der normale Abruf lädt nur die letzten 7 Tage */}
      <button
        type="button"
        disabled={syncing}
        onClick={() => {
          if (window.confirm('Die gesamte Garmin-Historie laden? Bereits vorhandene Trainings werden übersprungen.')) {
            sync(FULL_HISTORY_DAYS)
          }
        }}
        className="min-h-9 self-start text-caption font-semibold text-lime disabled:text-ink-muted"
      >
        Gesamte Historie laden
      </button>
      {message && <p className="text-caption text-ink-soft">{message}</p>}
    </section>
  )
}
