/* Spark service worker — call alerts.
 *
 * This file is what lets a call ring a locked phone or a closed tab. The
 * server (app/api/calls/[id]/notify) sends a Web Push message; the browser
 * wakes this worker even when no Spark page is open, and we turn the message
 * into a system notification with Answer / Decline buttons.
 *
 * Plain JavaScript on purpose: it is served as-is from /sw.js and never goes
 * through the Next.js bundler.
 */

self.addEventListener('install', () => {
  // Take over as soon as a new version is installed; there is no cached
  // state here that an old page could depend on.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function callUrl(data) {
  return `/matches/${data.matchId}/call/${data.callId}`
}

function chatUrl(data) {
  return `/matches/${data.matchId}`
}

async function visibleClients() {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return all.filter((c) => c.visibilityState === 'visible')
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    return
  }

  event.waitUntil(
    (async () => {
      const kindLabel = data.kind === 'video' ? 'video' : 'voice'

      if (data.type === 'incoming-call') {
        // If Spark is already on screen, the in-page ringer handles it — a
        // system notification on top would be a second, competing ring. Tell
        // the page to check right now instead of waiting for its next poll.
        const visible = await visibleClients()
        if (visible.length > 0) {
          visible.forEach((c) => c.postMessage({ type: 'incoming-call', callId: data.callId }))
          return
        }

        await self.registration.showNotification(data.callerName || 'Incoming call', {
          body: `Incoming ${kindLabel} call on Spark`,
          icon: data.callerPhoto || '/icon-192.png',
          badge: '/badge-96.png',
          tag: `call-${data.callId}`,
          renotify: true,
          // Stay on screen until acted on (desktop); phones keep it in the
          // shade regardless.
          requireInteraction: true,
          vibrate: [600, 300, 600, 300, 600, 300, 600],
          actions: [
            { action: 'decline', title: 'Decline' },
            { action: 'accept', title: 'Answer' },
          ],
          data,
        })
        return
      }

      if (data.type === 'missed-call') {
        // Same tag: replaces the ringing notification rather than stacking.
        await self.registration.showNotification(data.callerName || 'Missed call', {
          body: `Missed ${kindLabel} call`,
          icon: '/icon-192.png',
          badge: '/badge-96.png',
          tag: `call-${data.callId}`,
          renotify: false,
          data,
        })
      }
    })(),
  )
})

async function openOrFocus(url) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const existing = all.find((c) => new URL(c.url).origin === self.location.origin)
  if (existing) {
    try {
      await existing.focus()
    } catch {
      /* focus can be refused; navigating still helps */
    }
    try {
      // Only works on pages this worker controls (all of them after
      // clients.claim(), but not a tab opened before the worker existed).
      await existing.navigate(url)
    } catch {
      // Fall back to asking the page to route itself (components/push-registrar.tsx).
      existing.postMessage({ type: 'navigate', url })
    }
    return
  }
  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  event.notification.close()

  event.waitUntil(
    (async () => {
      if (data.type === 'incoming-call') {
        if (event.action === 'decline') {
          // Same-origin fetch from a service worker carries the session
          // cookie, so this is an authenticated request as the callee.
          try {
            await fetch(`/api/calls/${data.callId}/status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'declined' }),
              credentials: 'same-origin',
            })
          } catch {
            /* offline: the caller will time out instead */
          }
          return
        }
        // "Answer", or a tap on the notification body. Opening the call page
        // as the callee answers the call (see the call page).
        await openOrFocus(event.action === 'accept' ? callUrl(data) : chatUrl(data))
        return
      }

      if (data.type === 'missed-call') {
        await openOrFocus(chatUrl(data))
      }
    })(),
  )
})
