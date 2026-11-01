import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import Button from '@/components/Button'
import { useLog } from '@/features/log/LogContext'
import { getGarminStatus, syncGarmin } from './garminApi'

const FULL_HISTORY_DAYS = 3650

export default function GarminCard() {
  const { changed } = useLog()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getGarminStatus().then(res => setConnected(res.data.connected)).catch(() => {})
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
      setMessage('Garmin-Abruf hat nicht geklappt. Falls dein Key abgelaufen ist, kannst du ihn im Profil ändern.')
    } finally {
      setSyncing(false)
    }
  }

  if (connected === null) return null

  if (!connected) {
    return (
      <section aria-label="Garmin" className="flex items-center justify-between gap-3 rounded-md bg-surface-1 p-3">
        <div className="min-w-0">
          <h2 className="text-body font-semibold text-ink">Garmin</h2>
          <p className="text-caption text-ink-muted">Noch nicht verbunden</p>
        </div>
        <Link to="/profile" className="inline-flex min-h-tap shrink-0 items-center rounded-md border border-control-line px-4 text-body font-semibold text-ink">
          Verbinden
        </Link>
      </section>
    )
  }

  return (
    <section aria-label="Garmin" className="flex flex-col gap-1 rounded-md bg-surface-1 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-body font-semibold text-ink">Garmin</h2>
          <p className="text-caption text-ink-muted">Lädt täglich um 18:30 Uhr</p>
        </div>
        <Button variant="secondary" disabled={syncing} onClick={() => sync()} className="shrink-0 disabled:bg-surface-2">
          <RefreshCw size={18} className={syncing ? 'animate-spin' : undefined} aria-hidden />
          Jetzt laden
        </Button>
      </div>
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
