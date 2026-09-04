import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { SwipeStack } from '@/components/swipe-stack'
import { Profile } from '@/lib/types'

const PROFILE_COLUMNS =
  'id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return null

  // These three don't depend on each other. Awaited one at a time they were
  // three full round trips stacked end to end before the deck query could
  // even start; together they cost one.
  const [{ data: currentProfile }, { data: swipedProfiles }, { data: blocked }] =
    await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).single(),
      // Profiles already swiped on.
      supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id),
      // Anyone this user has blocked. (People who blocked *them* are handled
      // below — that list isn't readable by this user for safety reasons, so
      // the filtering happens in the database instead.)
      supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
    ])

  if (!currentProfile) return null

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
  if (currentProfile.interested_in !== 'everyone') {
    query = query.eq('gender', currentProfile.interested_in)
  }

  // ...and by whether the other person would be interested in this user.
  //
  // The original query only applied the first filter, so a straight man
  // would be shown lesbian profiles: he'd like them, they'd never like him
  // back, and the match rate would look mysteriously broken. Mutual
  // preference filtering is what makes a swipe deck feel like it works.
  query = query.or(`interested_in.eq.everyone,interested_in.eq.${currentProfile.gender}`)

  const { data: profiles } = await query

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Discover</h1>
      </header>

      <SwipeStack profiles={(profiles || []) as Profile[]} currentUserId={user.id} />
    </div>
  )
}
