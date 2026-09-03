import { createClient } from '@/lib/supabase/server'
import { MatchList } from '@/components/match-list'
<<<<<<< HEAD

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get matches with profiles
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      user1:profiles!matches_user1_id_fkey(*),
      user2:profiles!matches_user2_id_fkey(*)
    `)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('matched_at', { ascending: false })

  // Get last messages for each match
  const matchesWithMessages = await Promise.all(
    (matches || []).map(async (match) => {
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', match.id)
        .eq('read', false)
        .neq('sender_id', user.id)

      const otherUser = match.user1_id === user.id ? match.user2 : match.user1

      return {
        ...match,
        profile: otherUser,
        lastMessage,
        unreadCount: unreadCount || 0,
      }
    })
  )
=======
import type { MatchWithProfile, Profile } from '@/lib/types'

interface MatchSummaryRow {
  match_id: string
  matched_at: string
  other_user_id: string
  last_message_id: string | null
  last_message_content: string | null
  last_message_sender_id: string | null
  last_message_created_at: string | null
  unread_count: number
}

export default async function MatchesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // ONE query for every match, its last message, and its unread count.
  //
  // The previous version looped over matches and fired two more queries per
  // match — 40 matches meant 81 round trips on every page load, and it used
  // .single() for the last message, which throws for any match where nobody
  // has said anything yet (i.e. every brand-new match). See database/006.
  const { data: summaries, error } = await supabase.rpc('get_match_summaries')

  if (error) {
    // Most likely cause: database/006_match_summaries.sql hasn't been run yet.
    console.error('get_match_summaries failed:', error.message)
  }

  const rows = (summaries ?? []) as MatchSummaryRow[]

  // ONE more query for all the other users' profiles.
  const otherIds = rows.map((r) => r.other_user_id)
  const { data: profiles } = otherIds.length
    ? await supabase
        .from('profiles')
        .select(
          'id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at',
        )
        .in('id', otherIds)
    : { data: [] as Profile[] }

  const profilesById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]))

  const matches: MatchWithProfile[] = rows.flatMap((row) => {
    const profile = profilesById.get(row.other_user_id)
    if (!profile) return [] // profile deleted mid-flight; skip rather than crash

    return [
      {
        id: row.match_id,
        user1_id: user.id,
        user2_id: row.other_user_id,
        matched_at: row.matched_at,
        is_active: true,
        profile,
        lastMessage: row.last_message_id
          ? {
              id: row.last_message_id,
              match_id: row.match_id,
              sender_id: row.last_message_sender_id!,
              content: row.last_message_content!,
              read: true,
              created_at: row.last_message_created_at!,
            }
          : undefined,
        unreadCount: Number(row.unread_count) || 0,
      },
    ]
  })
>>>>>>> 2335d4b (version 2.0)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Matches</h1>
      </header>
<<<<<<< HEAD
      
      <MatchList matches={matchesWithMessages} currentUserId={user.id} />
=======

      <MatchList matches={matches} currentUserId={user.id} />
>>>>>>> 2335d4b (version 2.0)
    </div>
  )
}
