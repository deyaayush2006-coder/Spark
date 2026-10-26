import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Moves a call to a new status on behalf of the signed-in user.
 *
 * Pages normally update `calls` directly through supabase-js. This route
 * exists for the two places that can't:
 *
 *  - The service worker (public/sw.js), when someone taps "Decline" on a
 *    call notification. It has no Supabase client, but a same-origin fetch
 *    from a service worker carries the session cookies.
 *  - navigator.sendBeacon() on `pagehide`, so closing the tab mid-call ends
 *    the call instead of leaving the other person talking to nobody.
 *
 * It runs with the user's own session, so RLS and the transition rules in
 * database/008 decide what is allowed; this route adds nothing on top.
 */

const ALLOWED = new Set(['accepted', 'declined', 'ended', 'missed'])

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: callId } = await params

  let status: unknown
  try {
    // sendBeacon may send text/plain; parse the raw body either way.
    status = JSON.parse(await request.text())?.status
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (typeof status !== 'string' || !ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('calls')
    .update({ status })
    .eq('id', callId)
    .select('status')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Call not found' }, { status: 404 })

  return NextResponse.json({ status: data.status })
}
