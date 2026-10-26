/**
 * Small helpers shared by the caller, the callee and the call screen.
 */

/** How long the caller waits for an answer before giving up. */
export const RING_TIMEOUT_MS = 45_000

/**
 * Room ids must be unguessable. Prefer the platform RNG, but fall back to
 * getRandomValues so this also works outside a secure context.
 */
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Ask the server to push this call to the callee's devices. Fire-and-forget:
 * the in-app ringer works without it, push just reaches people who don't
 * have Spark open. The server decides what to send from the call's status.
 */
export function notifyCallee(callId: string): void {
  void fetch(`/api/calls/${callId}/notify`, { method: 'POST', keepalive: true }).catch(() => {})
}

/**
 * Set a call's status from a page that is going away (tab closed, app
 * swiped off). sendBeacon is the one request a browser promises to finish
 * after the page is gone; a normal fetch is cancelled.
 */
export function beaconCallStatus(callId: string, status: 'ended' | 'missed' | 'declined'): void {
  const body = JSON.stringify({ status })
  const url = `/api/calls/${callId}/status`
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
  } else {
    void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
  }
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}
