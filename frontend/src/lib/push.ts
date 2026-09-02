import { getVapidKey, savePushSubscription, removePushSubscription } from '@/features/push/pushApi'

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** PWA im Standalone-Modus? Auf iOS ist Web Push nur dann verfügbar. */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    // iOS Safari legacy flag
    || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js')
}

function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return buffer
}

export async function currentPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'subscribed' : 'unsubscribed'
}

export async function enablePush(): Promise<void> {
  const { data } = await getVapidKey()
  if (!data.enabled || !data.publicKey) {
    throw new Error('Push ist auf dem Server nicht konfiguriert.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Benachrichtigungen wurden nicht erlaubt.')
  }

  const reg = await registerServiceWorker()
  await navigator.serviceWorker.ready

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToBuffer(data.publicKey),
  })

  const json = sub.toJSON()
  if (!json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Subscription unvollständig.')
  }
  await savePushSubscription({
    endpoint: sub.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  })
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await removePushSubscription(sub.endpoint).catch(() => { /* Server-Eintrag ggf. schon weg */ })
  await sub.unsubscribe()
}
