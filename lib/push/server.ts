import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Web Push sender. Server-only: it needs the VAPID private key and reads
 * push_subscriptions with the service-role key.
 *
 * Push is what makes a call ring a phone that is locked, or a laptop where
 * Spark is in a background tab or closed entirely. Realtime and polling only
 * work while the page is alive and visible; a push message is delivered by
 * the OS/browser vendor (FCM, Mozilla, Apple) and wakes our service worker
 * (public/sw.js) even when no Spark page is open.
 */

export type PushPayload =
  | {
      type: 'incoming-call'
      callId: string
      matchId: string
      kind: 'audio' | 'video'
      callerName: string
      callerPhoto: string | null
    }
  | {
      type: 'missed-call'
      callId: string
      matchId: string
      kind: 'audio' | 'video'
      callerName: string
    }

let configured: boolean | null = null

function configure(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

  if (!publicKey || !privateKey) {
    console.warn(
      '[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set, so calls will only ring ' +
        'while the callee has Spark open. Generate a pair with `npx web-push generate-vapid-keys`.',
    )
    configured = false
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export function isPushConfigured(): boolean {
  return configure()
}

/**
 * Sends `payload` to every device `userId` has registered. Returns how many
 * deliveries the push services accepted. Subscriptions the push service says
 * are gone (404/410 — app uninstalled, permission revoked, browser data
 * cleared) are deleted so we stop paying for them.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0

  const admin = createAdminClient()
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.warn('[push] could not load subscriptions:', error.message)
    return 0
  }
  if (!subs || subs.length === 0) return 0

  const body = JSON.stringify(payload)
  const isCall = payload.type === 'incoming-call'

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        {
          // A ring delivered a minute late is worse than none: the call is
          // over. Let the push service drop it instead.
          TTL: isCall ? 45 : 60 * 60 * 24,
          // 'high' lets Android wake a phone in Doze mode for a call.
          urgency: isCall ? 'high' : 'normal',
          // Same topic replaces an undelivered ring with the missed-call
          // notice instead of delivering both.
          topic: `call-${payload.callId.replace(/[^A-Za-z0-9]/g, '').slice(0, 26)}`,
        },
      ),
    ),
  )

  const dead: string[] = []
  let delivered = 0
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      delivered++
      return
    }
    const statusCode = (result.reason as { statusCode?: number })?.statusCode
    if (statusCode === 404 || statusCode === 410) {
      dead.push(subs[i].id)
    } else {
      console.warn('[push] delivery failed:', statusCode, (result.reason as Error)?.message)
    }
  })

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', dead)
  }
  if (delivered > 0) {
    await admin
      .from('push_subscriptions')
      .update({ last_seen_at: new Date().toISOString() })
      .in(
        'id',
        subs.filter((_, i) => results[i].status === 'fulfilled').map((s) => s.id),
      )
  }

  return delivered
}
