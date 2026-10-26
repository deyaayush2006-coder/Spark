import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiscoverProfile } from '@/lib/types'

export const DECK_PAGE_SIZE = 20

const PROFILE_COLUMNS =
  'id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at'

let warnedMissingRpc = false

/**
 * The next page of the Discover deck, best match first.
 *
 * Uses get_discover_profiles() from database/009, which ranks by two-way
 * compatibility, activity and who already liked you, and applies everyone's
 * dealbreakers in both directions. If that migration hasn't been run yet,
 * falls back to the old unranked query so the deck still works.
 *
 * Works with both the server and the browser Supabase client.
 *
 * @param exclude ids already on screen, so a refill doesn't repeat them
 */
export async function fetchDiscoverDeck(
  supabase: SupabaseClient,
  userId: string,
  exclude: string[] = [],
  limit = DECK_PAGE_SIZE,
): Promise<DiscoverProfile[]> {
  const { data, error } = await supabase.rpc('get_discover_profiles', {
    p_limit: limit,
    p_exclude: exclude,
  })

  if (!error) return (data ?? []) as DiscoverProfile[]

  if (error.code !== 'PGRST202' && error.code !== '42883') {
    console.error('get_discover_profiles failed:', error.message)
    return []
  }

  if (!warnedMissingRpc) {
    warnedMissingRpc = true
    console.warn(
      'get_discover_profiles() is missing — run database/009_ranked_discovery.sql. Using the unranked fallback deck.',
    )
  }
  return legacyDeck(supabase, userId, exclude, limit)
}

async function legacyDeck(
  supabase: SupabaseClient,
  userId: string,
  exclude: string[],
  limit: number,
): Promise<DiscoverProfile[]> {
  const [{ data: me }, { data: swiped }, { data: blocked }] = await Promise.all([
    supabase.from('profiles').select('gender, interested_in').eq('id', userId).single(),
    supabase.from('swipes').select('swiped_id').eq('swiper_id', userId),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', userId),
  ])
  if (!me) return []

  const excluded = new Set<string>([userId, ...exclude])
  swiped?.forEach((s) => excluded.add(s.swiped_id))
  blocked?.forEach((b) => excluded.add(b.blocked_id))

  let query = supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    // PostgREST needs each UUID quoted inside an in-list.
    .not('id', 'in', `(${[...excluded].map((id) => `"${id}"`).join(',')})`)
    .or(`interested_in.eq.everyone,interested_in.eq.${me.gender}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (me.interested_in !== 'everyone') query = query.eq('gender', me.interested_in)

  const { data } = await query
  return (data ?? []) as DiscoverProfile[]
}
