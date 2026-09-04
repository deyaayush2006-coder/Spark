import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { MatchList } from '@/components/match-list'
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
  const user = await getCurrentUser()

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Matches</h1>
      </header>

      <MatchList matches={matches} currentUserId={user.id} />
    </div>
  )
}
