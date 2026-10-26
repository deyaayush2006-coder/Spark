import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPushConfigured, sendPushToUser } from '@/lib/push/server'

/**
 * Sends the callee a push notification for this call.
 *
 * The caller's browser hits this right after creating the call row (and
 * again when the call ends unanswered). What gets sent depends on the row,
 * not on anything in the request:
 *
 *   status 'ringing', < 60s old   -> "Incoming video call from Priya"
 *   status 'missed'                -> "Missed video call from Priya"
 *   anything else                  -> nothing
 *
 * Each kind goes out at most once per call. The guard is an atomic
 * `UPDATE ... WHERE ring_notified_at IS NULL RETURNING`, so a caller hammering
 * this endpoint can't turn it into a way to spam someone's lock screen.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: callId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // RLS limits this to calls the user is part of.
  const { data: call } = await supabase
    .from('calls')
    .select('id, match_id, caller_id, callee_id, kind, status, created_at, answered_at')
    .eq('id', callId)
    .maybeSingle()

  if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  if (call.caller_id !== user.id) {
    return NextResponse.json({ error: 'Only the caller can notify' }, { status: 403 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ sent: 0, reason: 'push-not-configured' })
  }

  const admin = createAdminClient()
  const ageMs = Date.now() - new Date(call.created_at).getTime()

  let type: 'incoming-call' | 'missed-call'
  let claimed: { id: string } | null = null

  if (call.status === 'ringing' && ageMs < 60_000) {
    type = 'incoming-call'
    const { data } = await admin
      .from('calls')
      .update({ ring_notified_at: new Date().toISOString() })
      .eq('id', call.id)
      .is('ring_notified_at', null)
      .select('id')
      .maybeSingle()
    claimed = data
  } else if (call.status === 'missed' && !call.answered_at) {
    type = 'missed-call'
    const { data } = await admin
      .from('calls')
      .update({ missed_notified_at: new Date().toISOString() })
      .eq('id', call.id)
      .is('missed_notified_at', null)
      // Only tell them they missed a call if their phone was told it rang.
      .not('ring_notified_at', 'is', null)
      .select('id')
      .maybeSingle()
    claimed = data
  } else {
    return NextResponse.json({ sent: 0, reason: `status-${call.status}` })
  }

  if (!claimed) return NextResponse.json({ sent: 0, reason: 'already-notified' })

  const { data: caller } = await admin
    .from('profiles')
    .select('name, photos')
    .eq('id', call.caller_id)
    .maybeSingle()

  const callerName = caller?.name ?? 'Someone'
  const kind = call.kind as 'audio' | 'video'

  const sent = await sendPushToUser(
    call.callee_id,
    type === 'incoming-call'
      ? {
          type,
          callId: call.id,
          matchId: call.match_id,
          kind,
          callerName,
          callerPhoto: caller?.photos?.[0] ?? null,
        }
      : { type, callId: call.id, matchId: call.match_id, kind, callerName },
  )

  return NextResponse.json({ sent })
}
