import { supabase } from './supabase'

// Convert a URL-safe base64 string (VAPID public key) to a Uint8Array for
// the PushManager.subscribe() applicationServerKey parameter.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const buf = new ArrayBuffer(raw.length)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

async function authHeader(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) throw new Error('Push not supported on this device')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('permission-denied')

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) throw new Error('VAPID public key not configured')

  const reg = await navigator.serviceWorker.ready
  let sub  = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const json = sub.toJSON()
  const res  = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({
      endpoint:  json.endpoint,
      p256dh:    json.keys?.p256dh,
      auth:      json.keys?.auth,
      userAgent: navigator.userAgent,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    await sub.unsubscribe().catch(() => {})
    throw new Error(`subscribe ${res.status}: ${body || res.statusText}`)
  }
  return sub
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return

  await fetch('/api/notifications/unsubscribe', {
    method:  'POST',
    headers: await authHeader(),
    body:    JSON.stringify({ endpoint: sub.endpoint }),
  })
  await sub.unsubscribe()
}

export async function sendTestPush(): Promise<void> {
  // Send only to *this* browser's endpoint. Each browser registers its own
  // Push subscription, so without scoping the test would land on whichever
  // device subscribed first (e.g. Safari) instead of the one you're using now.
  let endpoint: string | undefined
  if (isPushSupported()) {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    endpoint = sub?.endpoint
  }

  const res  = await fetch('/api/notifications/test', {
    method:  'POST',
    headers: await authHeader(),
    body:    JSON.stringify({ endpoint }),
  })
  const json = await res.json().catch(() => null) as
    | { sent?: number; failed?: number; total?: number; results?: unknown[]; error?: string }
    | null
  console.log('[test push] result:', json)
  if (!res.ok || !json) {
    throw new Error(`test failed: ${res.status} ${json?.error ?? ''}`)
  }
  if ((json.sent ?? 0) === 0) {
    throw new Error(`no notifications delivered (failed: ${json.failed ?? 0})`)
  }
}
