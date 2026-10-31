import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import Button from '@/components/Button'
import { currentPushState, isStandalone, enablePush, disablePush, type PushState } from '@/lib/push'
import { getVapidKey, sendTestPush } from './pushApi'

type UiState = PushState | 'loading' | 'server-disabled'

export default function ReminderSettings() {
  const [state, setState] = useState<UiState>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getVapidKey()
        if (!data.enabled || !data.publicKey) {
          setState('server-disabled')
          return
        }
      } catch {
        // vapid-key nicht erreichbar → normale Client-Erkennung, Fehler kommt ggf. beim Aktivieren
      }
      setState(await currentPushState())
    })()
  }, [])

  async function toggle() {
    setBusy(true)
    setMsg(null)
    try {
      if (state === 'subscribed') {
        await disablePush()
        setState('unsubscribed')
      } else {
        await enablePush()
        setState('subscribed')
        setMsg('Erinnerungen aktiviert.')
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Das hat gerade nicht geklappt.')
      setState(await currentPushState())
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setBusy(true)
    setMsg(null)
    try {
      await sendTestPush()
      setMsg('Test-Benachrichtigung gesendet, sie sollte gleich erscheinen.')
    } catch {
      setMsg('Test hat nicht geklappt.')
    } finally {
      setBusy(false)
    }
  }

  const iosNeedsInstall = !isStandalone()
    && /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <section aria-label="Erinnerungen" className="flex flex-col gap-3 rounded-lg bg-surface-1 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-ink-soft">
          {state === 'subscribed' ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />}
        </span>
        <div className="min-w-0">
          <h2 className="text-heading font-semibold text-ink">Erinnerungen</h2>
          <p className="text-caption text-ink-muted">Täglich um 12:30 und 19:00 Uhr</p>
        </div>
      </div>

      {state === 'loading' && <p className="text-caption text-ink-muted">Lade…</p>}
      {state === 'server-disabled' && <p className="text-caption text-ink-muted">Noch nicht verfügbar.</p>}

      {state === 'unsupported' && (
        <p className="text-caption text-warning">
          {iosNeedsInstall
            ? 'Auf dem iPhone zuerst über „Teilen → Zum Home-Bildschirm“ installieren (iOS 16.4+), dann hier aktivieren.'
            : 'Dieser Browser unterstützt keine Web-Push-Benachrichtigungen.'}
        </p>
      )}

      {state === 'denied' && (
        <p className="text-caption text-warning">
          Benachrichtigungen sind blockiert. In den Website-Einstellungen des Browsers wieder erlauben.
        </p>
      )}

      {(state === 'subscribed' || state === 'unsubscribed') && (
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={toggle} className="flex-1 disabled:bg-surface-2">
            {busy ? '…' : state === 'subscribed' ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
          {state === 'subscribed' && (
            <Button variant="ghost" disabled={busy} onClick={test} className="disabled:bg-transparent">Test senden</Button>
          )}
        </div>
      )}

      {msg && <p className="text-caption text-ink-soft">{msg}</p>}
    </section>
  )
}
