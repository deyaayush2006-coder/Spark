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
 *  - Tokens are short-lived and scoped to that single room. LiveKit refreshes
 *    tokens for connected participants itself, so a long call doesn't drop
 *    when this one expires.
 */

/**
 * "Calls work between my own phone and laptop but not with anyone far away"
 * is the textbook symptom of pointing the app at a LiveKit server on your
 * own machine or Wi-Fi (e.g. `livekit-server --dev`). Devices on the same
 * network can reach it; nobody else can, and browsers block a plain ws://
 * server from an https:// page outright. Say so plainly instead of letting
 * the call hang on "Connecting…".
 */
function diagnoseLiveKitUrl(url: string): { fatal: boolean; message: string } | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { fatal: true, message: `NEXT_PUBLIC_LIVEKIT_URL ("${url}") is not a valid URL. It should look like wss://your-project.livekit.cloud` }
  }

  const host = parsed.hostname
  const isPrivate =
    host === 'localhost' ||
    host.endsWith('.local') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '0.0.0.0'

  if (isPrivate) {
    return {
      fatal: process.env.NODE_ENV === 'production',
      message:
        `NEXT_PUBLIC_LIVEKIT_URL points at ${host}, a server on your own machine or Wi-Fi. ` +
        'Only devices on that same network can reach it, which is why calls work between your own ' +
        'devices and fail for everyone else. Use a LiveKit Cloud URL (wss://<project>.livekit.cloud) ' +
        'or a public server with TURN enabled.',
    }
  }
  if (parsed.protocol !== 'wss:') {
    return {
      fatal: process.env.NODE_ENV === 'production',
      message:
        `NEXT_PUBLIC_LIVEKIT_URL uses ${parsed.protocol}// — browsers block unencrypted ws:// from an https:// page. ` +
        'Use the wss:// URL.',
    }
  }
  return null
}

export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim()

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      {
        error:
          'Calling is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET and NEXT_PUBLIC_LIVEKIT_URL in .env.local.',
      },
      { status: 503 },
    )
  }

  const problem = diagnoseLiveKitUrl(wsUrl)
  if (problem) {
    console.warn(`[livekit] ${problem.message}`)
    if (problem.fatal) return NextResponse.json({ error: problem.message }, { status: 503 })
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
    .select('id, caller_id, callee_id, room_name, status, kind, created_at')
    .eq('id', callId)
    .single()

  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  if (call.caller_id !== user.id && call.callee_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 })
  }

  if (call.status !== 'ringing' && call.status !== 'accepted') {
    const label: Record<string, string> = {
      declined: 'was declined',
      ended: 'has ended',
      missed: 'was missed',
    }
    return NextResponse.json(
      { error: `This call ${label[call.status] ?? 'is over'}.` },
      { status: 409 },
    )
  }

  // A call nobody answered for a minute is over, even if the caller's tab
  // died before it could say so.
  if (call.status === 'ringing' && Date.now() - new Date(call.created_at).getTime() > 60_000) {
    return NextResponse.json({ error: 'This call was missed.' }, { status: 409 })
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
    ttl: '30m',
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
    warning: problem?.message,
  })
}
