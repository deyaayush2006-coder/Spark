import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient } from '@/lib/supabase/server'

/**
 * Mints a LiveKit access token for one specific call.
 *
 * Security model — this is the part that matters:
 *  - The LiveKit API secret NEVER reaches the browser. It only signs tokens here.
 *  - The room name is taken from the `calls` row, not from the request body.
 *    If it came from the body, anyone could ask for a token to any room and
 *    drop into a stranger's video call.
 *  - RLS on `calls` already restricts SELECT to the two participants, so if
 *    the row comes back at all the caller is authorised. We re-check the ids
 *    anyway, because defence in depth costs three lines.
 *  - Tokens are short-lived (15 min) and scoped to that single room.
 */
export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      {
        error:
          'Calling is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET and NEXT_PUBLIC_LIVEKIT_URL in .env.local.',
      },
      { status: 503 },
    )
  }

  let callId: unknown
  try {
    const body = await request.json()
    callId = body?.callId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof callId !== 'string' || callId.length === 0) {
    return NextResponse.json({ error: 'callId is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: call } = await supabase
    .from('calls')
    .select('id, caller_id, callee_id, room_name, status, kind')
    .eq('id', callId)
    .single()

  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  if (call.caller_id !== user.id && call.callee_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 })
  }

  if (call.status !== 'ringing' && call.status !== 'accepted') {
    return NextResponse.json({ error: `This call has already ${call.status}` }, { status: 409 })
  }

  // Display name shown to the other participant in the call UI.
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.name ?? 'Someone',
    ttl: '15m',
  })

  at.addGrant({
    room: call.room_name,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Two-person call: nobody needs to create or manage rooms.
    roomCreate: false,
    roomAdmin: false,
  })

  return NextResponse.json({
    token: await at.toJwt(),
    serverUrl: wsUrl,
    kind: call.kind,
  })
}
