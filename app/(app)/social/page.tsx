import { createClient } from '@/lib/supabase/server'
import { SocialTabs } from '@/components/social-tabs'

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get followers (people following me)
  const { data: followers } = await supabase
    .from('followers')
    .select('*, profile:profiles!followers_follower_id_fkey(*)')
    .eq('following_id', user.id)

  // Get following (people I follow)
  const { data: following } = await supabase
    .from('followers')
    .select('*, profile:profiles!followers_following_id_fkey(*)')
    .eq('follower_id', user.id)

  // Get friend requests
  const { data: friendRequests } = await supabase
    .from('friend_requests')
    .select('*, sender:profiles!friend_requests_sender_id_fkey(*)')
    .eq('receiver_id', user.id)
    .eq('status', 'pending')

  // Get sent friend requests
  const { data: sentRequests } = await supabase
    .from('friend_requests')
    .select('*, receiver:profiles!friend_requests_receiver_id_fkey(*)')
    .eq('sender_id', user.id)
    .eq('status', 'pending')

  // Get all profiles for discovery (excluding self and already following)
  const followingIds = following?.map(f => f.following_id) || []
  followingIds.push(user.id)

  const { data: discoverProfiles } = await supabase
    .from('profiles')
    .select('*')
    .not('id', 'in', `(${followingIds.join(',')})`)
    .limit(20)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4">
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
