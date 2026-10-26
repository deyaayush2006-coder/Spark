/**
 * Browser side of call alerts: registers public/sw.js and keeps this
 * device's push subscription saved on the server.
 */

export type PushState =
  /** Browser has no Web Push at all (old browser, or http:// on a LAN IP). */
  | 'unsupported'
  /** iPhone/iPad Safari tab: push only works once Spark is on the Home Screen. */
  | 'ios-needs-install'
  /** Server has no VAPID key configured. */
  | 'not-configured'
  | 'default'
  | 'granted'
  | 'denied'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function isIos(): boolean {
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function getPushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'not-configured'
  if (isIos() && !isStandalone()) return 'ios-needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as PushState
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (err) {
    console.warn('[push] service worker registration failed:', err)
    return null
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
  return res.ok
}

/**
 * Makes sure this device has a live subscription saved on the server.
 * Never prompts: only acts when permission is already granted. Safe to call
 * on every app load — browsers rotate subscriptions now and then, and this
 * is how a rotated one gets picked up.
 */
export async function syncPushSubscription(): Promise<boolean> {
  if (getPushState() !== 'granted' || !VAPID_PUBLIC_KEY) return false
  const reg = await registerServiceWorker()
  if (!reg) return false
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  return saveSubscription(sub)
}

/**
 * Asks for notification permission and subscribes. MUST be called from a
 * click handler: Safari and Firefox refuse permission prompts that aren't
 * a direct response to a user gesture.
 */
export async function enablePush(): Promise<PushState> {
  const state = getPushState()
  if (state !== 'default' && state !== 'granted') return state

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission as PushState

  try {
    await syncPushSubscription()
  } catch (err) {
    console.warn('[push] subscribe failed:', err)
  }
  return 'granted'
}
