import { createClient } from '@/lib/supabase/server'
import { MatchList } from '@/components/match-list'

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Matches</h1>
      </header>
      
      <MatchList matches={matchesWithMessages} currentUserId={user.id} />
    </div>
  )
}
