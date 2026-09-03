import { createClient } from '@/lib/supabase/server'
import { SwipeStack } from '@/components/swipe-stack'
import { Profile } from '@/lib/types'

<<<<<<< HEAD
export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
=======
const PROFILE_COLUMNS =
  'id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
>>>>>>> 2335d4b (version 2.0)
    .eq('id', user.id)
    .single()

  if (!currentProfile) return null

<<<<<<< HEAD
  // Get profiles the user has already swiped on
=======
  // Profiles already swiped on.
>>>>>>> 2335d4b (version 2.0)
  const { data: swipedProfiles } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', user.id)

<<<<<<< HEAD
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
=======
  // Anyone this user has blocked. (People who blocked *them* are handled
  // below — that list isn't readable by this user for safety reasons, so
  // the filtering happens in the database instead.)
  const { data: blocked } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id)

  const excludedIds = new Set<string>([user.id])
  swipedProfiles?.forEach((s) => excludedIds.add(s.swiped_id))
  blocked?.forEach((b) => excludedIds.add(b.blocked_id))

  let query = supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    // PostgREST needs each UUID quoted inside an in-list. Unquoted values
    // break as soon as one contains a character PostgREST treats specially,
    // and the failure is a silent empty result rather than an error.
    .not('id', 'in', `(${[...excludedIds].map((id) => `"${id}"`).join(',')})`)
    .order('created_at', { ascending: false })
    .limit(20)

  // Filter by what THIS user is looking for.
>>>>>>> 2335d4b (version 2.0)
  if (currentProfile.interested_in !== 'everyone') {
    query = query.eq('gender', currentProfile.interested_in)
  }

<<<<<<< HEAD
=======
  // ...and by whether the other person would be interested in this user.
  //
  // The original query only applied the first filter, so a straight man
  // would be shown lesbian profiles: he'd like them, they'd never like him
  // back, and the match rate would look mysteriously broken. Mutual
  // preference filtering is what makes a swipe deck feel like it works.
  query = query.or(`interested_in.eq.everyone,interested_in.eq.${currentProfile.gender}`)

>>>>>>> 2335d4b (version 2.0)
  const { data: profiles } = await query

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Discover</h1>
      </header>
<<<<<<< HEAD
      
      <SwipeStack 
        profiles={(profiles || []) as Profile[]} 
        currentUserId={user.id} 
      />
=======

      <SwipeStack profiles={(profiles || []) as Profile[]} currentUserId={user.id} />
>>>>>>> 2335d4b (version 2.0)
    </div>
  )
}
