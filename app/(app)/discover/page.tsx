import { createClient } from '@/lib/supabase/server'
import { SwipeStack } from '@/components/swipe-stack'
import { Profile } from '@/lib/types'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!currentProfile) return null

  // Get profiles the user has already swiped on
  const { data: swipedProfiles } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', user.id)

  const swipedIds = swipedProfiles?.map(s => s.swiped_id) || []
  swipedIds.push(user.id) // Exclude self

  // Get profiles based on user preferences
  let query = supabase
    .from('profiles')
    .select('*')
    .not('id', 'in', `(${swipedIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(20)

  // Filter by gender preference
  if (currentProfile.interested_in !== 'everyone') {
    query = query.eq('gender', currentProfile.interested_in)
  }

  const { data: profiles } = await query

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Discover</h1>
      </header>
      
      <SwipeStack 
        profiles={(profiles || []) as Profile[]} 
        currentUserId={user.id} 
      />
    </div>
  )
}
