import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { SocialTabs } from '@/components/social-tabs'

const PROFILE_COLUMNS =
  'id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at'

export default async function SocialPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return null

  // Four independent reads in one flight. Sequentially these were four
  // stacked round trips, and this page was the slowest tab to open because
  // of it.
  const [
    { data: followers },
    { data: following },
    { data: friendRequests },
    { data: sentRequests },
  ] = await Promise.all([
    // Followers (people following me)
    supabase
      .from('followers')
      .select(`*, profile:profiles!followers_follower_id_fkey(${PROFILE_COLUMNS})`)
      .eq('following_id', user.id),
    // Following (people I follow)
    supabase
      .from('followers')
      .select(`*, profile:profiles!followers_following_id_fkey(${PROFILE_COLUMNS})`)
      .eq('follower_id', user.id),
    // Incoming friend requests
    supabase
      .from('friend_requests')
      .select(`*, sender:profiles!friend_requests_sender_id_fkey(${PROFILE_COLUMNS})`)
      .eq('receiver_id', user.id)
      .eq('status', 'pending'),
    // Friend requests I've sent
    supabase
      .from('friend_requests')
      .select(`*, receiver:profiles!friend_requests_receiver_id_fkey(${PROFILE_COLUMNS})`)
      .eq('sender_id', user.id)
      .eq('status', 'pending'),
  ])

  // This one genuinely depends on `following`, so it stays a second hop.
  const followingIds = following?.map((f) => f.following_id) || []
  followingIds.push(user.id)

  const { data: discoverProfiles } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    // Quoted UUIDs, matching the discover deck: an unquoted in-list fails
    // silently as an empty result rather than an error.
    .not('id', 'in', `(${followingIds.map((id) => `"${id}"`).join(',')})`)
    .limit(20)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Social</h1>
      </header>
      
      <SocialTabs
        followers={followers || []}
        following={following || []}
        friendRequests={friendRequests || []}
        sentRequests={sentRequests || []}
        discoverProfiles={discoverProfiles || []}
        currentUserId={user.id}
      />
    </div>
  )
}
