import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Registers (POST) or forgets (DELETE) this browser's push subscription for
 * the signed-in user.
 *
 * The write uses the service-role client because push_subscriptions has no
 * client policies (see database/008). That is safe here because the user id
 * comes from the verified session, never from the request body.
 *
 * Upserting on `endpoint` matters: if two people share a laptop and both sign
 * in, the endpoint belongs to whoever registered it last. Without this the
 * first person would keep receiving the second person's calls.
 */

interface SubscriptionBody {
  endpoint?: unknown
  keys?: { p256dh?: unknown; auth?: unknown }
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: SubscriptionBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { endpoint, keys } = body
  const p256dh = keys?.p256dh
  const auth = keys?.auth
  if (
    !isHttpsUrl(endpoint) ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string' ||
    p256dh.length > 256 ||
    auth.length > 256
  ) {
    return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 })
  }

  const { error } = await createAdminClient()
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

  if (error) {
    console.warn('[push] could not save subscription:', error.message)
    return NextResponse.json(
      { error: 'Could not save subscription. Has database/008_reliable_calls_and_push.sql been run?' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let endpoint: unknown
  try {
    endpoint = (await request.json())?.endpoint
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!isHttpsUrl(endpoint)) {
    return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })
  }

  await createAdminClient()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
