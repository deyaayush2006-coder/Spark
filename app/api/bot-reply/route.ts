import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Canned bot responses, kept server-side so they can't be tampered with by
// a client sending an arbitrary "botResponse" value in the request body.
const BOT_RESPONSES = [
  "Hey! How's your day going?",
  "That's so interesting! Tell me more about yourself.",
  "I love that! We should definitely meet up sometime.",
  'You seem like such a fun person!',
  "Haha, you're making me smile!",
  'What do you like to do for fun?',
  "I've been thinking about trying something new lately. Any suggestions?",
  "That's really cool! I've always wanted to try that.",
  'You have great taste!',
  'I feel like we have a lot in common!',
]

/**
 * Sends a simulated reply from a bot match.
 *
 * Why this exists as a server route instead of a client-side insert:
 * `messages_insert_own` RLS requires `auth.uid() = sender_id`, so a signed-in
 * user's browser can never legitimately insert a message on behalf of
 * another account (bot or otherwise) — that's exactly what stops a user from
 * forging messages as anyone else. This route re-verifies the request server
 * side (real session, real match membership, other participant really is a
 * bot) and only then uses the service-role key to insert as the bot.
 */
export async function POST(request: Request) {
  let matchId: string | undefined
  try {
    const body = await request.json()
    matchId = body?.matchId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!matchId || typeof matchId !== 'string') {
    return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
  }

  // Authenticate the caller via their real session cookies.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Confirm the caller is actually a participant in this match, and find
  // the bot on the other side of it (RLS already scopes this select to
  // matches the caller belongs to, but we check explicitly too).
  const { data: match } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id, user1:profiles!matches_user1_id_fkey(id, is_bot), user2:profiles!matches_user2_id_fkey(id, is_bot)')
    .eq('id', matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const otherUser = match.user1_id === user.id ? match.user2 : match.user1
  const otherUserProfile = Array.isArray(otherUser) ? otherUser[0] : otherUser

  if (!otherUserProfile?.is_bot) {
    return NextResponse.json({ error: 'The other participant is not a bot' }, { status: 400 })
  }

  // Basic abuse guard: only reply if the human actually sent a message
  // recently, and don't stack up multiple bot replies back-to-back.
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('sender_id, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastMessage = recentMessages?.[0]
  if (!lastMessage || lastMessage.sender_id !== user.id) {
    return NextResponse.json({ error: 'No new message to reply to' }, { status: 409 })
  }

  const botResponse = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)]

  const admin = createAdminClient()
  const { data: botMessage, error } = await admin
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: otherUserProfile.id,
      content: botResponse,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to send bot reply' }, { status: 500 })
  }

  return NextResponse.json({ message: botMessage })
}
