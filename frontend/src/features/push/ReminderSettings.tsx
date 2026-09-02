import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { currentPushState, isStandalone, type PushState } from '@/lib/push'
import { enablePush, disablePush } from '@/lib/push'
import { sendTestPush } from './pushApi'

export default function ReminderSettings() {
  const [state, setState] = useState<PushState | 'loading'>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    currentPushState().then(setState)
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
      setMsg(e instanceof Error ? e.message : 'Ein Fehler ist aufgetreten.')
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
      setMsg('Test-Benachrichtigung gesendet – sollte gleich erscheinen.')
    } catch {
      setMsg('Test fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  const iosNeedsInstall = !isStandalone()
    && /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <div className="mx-4 mb-4 bg-white rounded-2xl p-4"
      style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ width: 36, height: 36, background: '#dcfce7' }}>
          {state === 'subscribed' ? <Bell size={17} color="#16A34A" /> : <BellOff size={17} color="#5a6b5e" />}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111816' }}>Erinnerungen</div>
          <p style={{ fontSize: 12, color: '#5a6b5e', marginTop: 2, lineHeight: 1.5 }}>
            Tägliche Push-Erinnerung um 12:30 und 19:00 Uhr ans Loggen.
          </p>

          {state === 'loading' && (
            <p style={{ fontSize: 12, color: '#a0b0a5', marginTop: 8 }}>Lade…</p>
          )}

          {state === 'unsupported' && (
            <p style={{ fontSize: 12, color: '#92400e', marginTop: 8, lineHeight: 1.5 }}>
              {iosNeedsInstall
                ? 'Auf dem iPhone zuerst über „Teilen → Zum Home-Bildschirm" installieren (iOS 16.4+), dann hier aktivieren.'
                : 'Dieser Browser unterstützt keine Web-Push-Benachrichtigungen.'}
            </p>
          )}

          {state === 'denied' && (
            <p style={{ fontSize: 12, color: '#92400e', marginTop: 8, lineHeight: 1.5 }}>
              Benachrichtigungen sind blockiert. In den Website-Einstellungen des Browsers wieder erlauben.
            </p>
          )}

          {(state === 'subscribed' || state === 'unsubscribed') && (
            <div className="flex items-center gap-3 mt-3">
              <button onClick={toggle} disabled={busy}
                className="px-4 py-2 rounded-xl disabled:opacity-50"
                style={{
                  fontSize: 13, fontWeight: 700,
                  background: state === 'subscribed' ? '#eef1ee' : '#16A34A',
                  color: state === 'subscribed' ? '#111816' : '#fff',
                }}>
                {busy ? '…' : state === 'subscribed' ? 'Deaktivieren' : 'Aktivieren'}
              </button>
              {state === 'subscribed' && (
                <button onClick={test} disabled={busy}
                  style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                  Test senden
                </button>
              )}
            </div>
          )}

          {msg && (
            <p style={{ fontSize: 12, color: '#5a6b5e', marginTop: 8 }}>{msg}</p>
          )}
        </div>
      </div>
    </div>
  )
}
