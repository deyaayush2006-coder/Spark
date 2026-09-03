import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_REASONS = [
  'harassment',
  'inappropriate_photos',
  'spam_or_scam',
  'fake_profile',
  'underage',
  'other',
] as const

type Reason = (typeof VALID_REASONS)[number]

/**
 * Files a report and (optionally) blocks the reported user in one action.
 *
 * Reporting almost always implies "and I never want to hear from this person
 * again", so `block` defaults to true. Blocking is enforced in the database
 * (see database/005), not just in the UI — a blocked pair cannot message or
 * call each other even if someone crafts a raw API request.
 */
export async function POST(request: Request) {
  let body: { reportedId?: unknown; reason?: unknown; details?: unknown; matchId?: unknown; block?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const reportedId = body.reportedId
  const reason = body.reason
  const details = typeof body.details === 'string' ? body.details.slice(0, 2000) : null
  const matchId = typeof body.matchId === 'string' ? body.matchId : null
  const shouldBlock = body.block !== false

  if (typeof reportedId !== 'string' || !reportedId) {
    return NextResponse.json({ error: 'reportedId is required' }, { status: 400 })
  }
  if (typeof reason !== 'string' || !VALID_REASONS.includes(reason as Reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (user.id === reportedId) {
    return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 })
  }

  const { error: reportError } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_id: reportedId,
    match_id: matchId,
    reason,
    details,
  })

  if (reportError) {
    return NextResponse.json({ error: 'Could not file the report' }, { status: 500 })
  }

  if (shouldBlock) {
    // Ignore a duplicate-key error: already blocked is a fine outcome.
    await supabase
      .from('blocks')
      .insert({ blocker_id: user.id, blocked_id: reportedId })
  }

  return NextResponse.json({ ok: true, blocked: shouldBlock })
}
