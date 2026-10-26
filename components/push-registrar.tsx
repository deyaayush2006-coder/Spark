'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registerServiceWorker, syncPushSubscription } from '@/lib/push/client'

/** Fired on window when the service worker hears about an incoming call. */
export const SW_INCOMING_CALL_EVENT = 'spark:incoming-call'

/**
 * Mounted once in the signed-in layout. Renders nothing.
 *
 *  - Registers public/sw.js so call notifications can arrive while Spark is
 *    closed.
 *  - Re-saves this device's push subscription if permission was already
 *    granted (it never prompts — components/call-alerts-card.tsx does that,
 *    from a button).
 *  - Relays messages from the worker: "navigate here" after a notification
 *    tap, and "a call just came in" so the in-page ringer reacts instantly.
 */
export function PushRegistrar() {
  const router = useRouter()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    void registerServiceWorker().then(() =>
      syncPushSubscription().catch((err) => console.warn('[push] sync failed:', err)),
    )

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string; callId?: string } | null
      if (data?.type === 'navigate' && typeof data.url === 'string' && data.url.startsWith('/')) {
        router.push(data.url)
      } else if (data?.type === 'incoming-call') {
        window.dispatchEvent(new CustomEvent(SW_INCOMING_CALL_EVENT, { detail: data.callId }))
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [router])

  return null
}
