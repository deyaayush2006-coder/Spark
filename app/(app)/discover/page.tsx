import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { SwipeStack } from '@/components/swipe-stack'
import { fetchDiscoverDeck } from '@/lib/discover'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return null

  // Ranking, mutual preferences, age ranges and blocks (both directions) all
  // happen in one database call now — see database/009_ranked_discovery.sql.
  // The deck used to be "20 newest profiles", still showed people who had
  // blocked you, and ran dry after 20 swipes. SwipeStack now refills itself.
  const profiles = await fetchDiscoverDeck(supabase, user.id)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4">
        <h1 className="text-2xl font-serif font-bold text-center love-gradient-text">Discover</h1>
      </header>

      <SwipeStack profiles={profiles} currentUserId={user.id} />
    </div>
  )
}
