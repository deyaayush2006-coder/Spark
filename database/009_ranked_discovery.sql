-- ============================================================================
-- 009 — Ranked, reciprocal discovery
-- Run AFTER 005 (needs public.blocks). Safe to re-run.
-- ============================================================================
--
-- WHAT WAS WRONG
--
-- The Discover deck was "the 20 newest profiles that pass the gender filter".
-- No ranking at all, and three outright bugs:
--   - People who had BLOCKED you still appeared in your deck. The page's
--     comment said this was filtered "in the database", but nothing did it.
--   - After 20 swipes the deck said "No more profiles" even when hundreds
--     were left, because nothing ever fetched a second page.
--   - The exclusion list was sent in the URL. After a few hundred swipes that
--     URL outgrows what PostgREST accepts and the deck goes blank.
--
-- WHAT THE BIG APPS DO (and what we copy)
--
--   - Reciprocity first. A dating recommender has to predict two things:
--     would I like them, and would they like me back. Hinge's "Most
--     Compatible" is explicitly built on this, and the research version
--     (RECON, Pizzato et al.) estimates each direction separately and
--     combines them with a harmonic mean, so a pair only scores high when
--     BOTH directions are high. That is what `reciprocal` below does.
--   - Mutual dealbreakers. Hinge only recommends people whose hard filters
--     you pass AND who pass yours. Here: gender preference and age range,
--     both ways.
--   - Activity. Tinder's own guidance is that active profiles are shown
--     higher, and it dropped its Elo "desirability" score in 2019. Liking
--     someone who hasn't opened the app in a month is a wasted like.
--   - People who already liked you are shown sooner. That is the single
--     biggest lever on match rate, and it is how Tinder's deck behaves.
--     Only super likes are revealed outright (that is what they are for);
--     ordinary likes just move someone up, mixed in with everyone else.
--   - Attention balancing. If the same few profiles are at the top of every
--     deck, they drown in likes they'll never answer and everyone else gets
--     nothing. People sitting on a big pile of unanswered likes are nudged
--     down a little, which spreads matches across more people.
--   - A little randomness, so the deck isn't identical every visit and
--     newer/quieter profiles get a look.


-- ============================================================================
-- COLUMNS
-- ============================================================================

-- When the user last used the app. Written only by touch_last_active()
-- below, and deliberately NOT readable by other users: exact last-seen times
-- are a stalking aid.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Backfill from real activity instead of stamping everyone "active now".
UPDATE public.profiles p
   SET last_active_at = GREATEST(
     p.created_at,
     p.updated_at,
     (SELECT MAX(s.created_at) FROM public.swipes s WHERE s.swiper_id = p.id),
     (SELECT MAX(m.created_at) FROM public.messages m WHERE m.sender_id = p.id)
   )
 WHERE p.last_active_at IS NULL;

ALTER TABLE public.profiles ALTER COLUMN last_active_at SET DEFAULT NOW();

-- Age range the user wants to see. NULL = no limit on that side.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS min_age_pref INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_age_pref INTEGER;

DO $$
BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_age_pref_range CHECK (
    (min_age_pref IS NULL OR min_age_pref BETWEEN 18 AND 120)
    AND (max_age_pref IS NULL OR max_age_pref BETWEEN 18 AND 120)
    AND (min_age_pref IS NULL OR max_age_pref IS NULL OR min_age_pref <= max_age_pref)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- profiles uses column-level grants (see 001), so new columns are invisible
-- to clients until granted. Age preferences: readable and editable by the
-- app. last_active_at: neither.
GRANT SELECT (min_age_pref, max_age_pref) ON public.profiles TO authenticated;
GRANT UPDATE (min_age_pref, max_age_pref) ON public.profiles TO authenticated;

CREATE INDEX IF NOT EXISTS idx_swipes_swiped_direction ON public.swipes(swiped_id, direction);


-- ============================================================================
-- ACTIVITY HEARTBEAT
-- ============================================================================
-- Called by the app while it is open. Throttled to one write per 5 minutes
-- per user so it costs nothing.

CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET last_active_at = NOW()
   WHERE id = auth.uid()
     AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '5 minutes');
$$;

REVOKE EXECUTE ON FUNCTION public.touch_last_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;


-- ============================================================================
-- THE DECK
-- ============================================================================
-- Returns the next `p_limit` profiles for the signed-in user, best first.
-- `p_exclude` is the ids already on screen, so the client can page in more
-- cards before the deck runs out.
--
-- SECURITY DEFINER because ranking needs data the user may not read
-- directly: other people's swipes on them, and blocks made BY other people.
-- It returns only public profile columns plus two derived fields, never the
-- raw swipes, never emails, never who blocked whom.

-- Drop first: CREATE OR REPLACE can't change a function's result columns.
DROP FUNCTION IF EXISTS public.get_discover_profiles(INTEGER, UUID[]);

CREATE FUNCTION public.get_discover_profiles(
  p_limit INTEGER DEFAULT 20,
  p_exclude UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  age INTEGER,
  gender TEXT,
  interested_in TEXT,
  bio TEXT,
  location TEXT,
  occupation TEXT,
  interests TEXT[],
  photos TEXT[],
  instagram_url TEXT,
  spotify_url TEXT,
  is_verified BOOLEAN,
  is_bot BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Interests you both listed, in the candidate's own spelling.
  shared_interests TEXT[],
  -- They super liked you. Shown on the card; ordinary likes are not.
  super_liked_you BOOLEAN
)
LANGUAGE sql
VOLATILE -- random()
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      p.id, p.age, p.gender, p.interested_in, p.min_age_pref, p.max_age_pref,
      NULLIF(lower(trim(p.location)), '') AS loc,
      ARRAY(
        SELECT DISTINCT lower(trim(i)) FROM unnest(COALESCE(p.interests, '{}')) i
        WHERE trim(i) <> ''
      ) AS ints,
      (
        0.5 * LEAST(COALESCE(cardinality(p.photos), 0), 3) / 3.0
        + 0.3 * (COALESCE(trim(p.bio), '') <> '')::INT
        + 0.2 * (COALESCE(cardinality(p.interests), 0) > 0)::INT
      ) AS quality
    FROM public.profiles p
    WHERE p.id = auth.uid()
  ),

  -- Hard filters: everything here is a mutual dealbreaker.
  pool AS (
    SELECT c.*, me.id AS me_id
    FROM public.profiles c
    CROSS JOIN me
    WHERE c.id <> me.id
      AND NOT (c.id = ANY (COALESCE(p_exclude, '{}')))
      -- Not already swiped on.
      AND NOT EXISTS (
        SELECT 1 FROM public.swipes s WHERE s.swiper_id = me.id AND s.swiped_id = c.id
      )
      -- No block in either direction.
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = me.id AND b.blocked_id = c.id)
           OR (b.blocker_id = c.id AND b.blocked_id = me.id)
      )
      -- Gender preference, both ways.
      AND (me.interested_in = 'everyone' OR c.gender = me.interested_in)
      AND (c.interested_in = 'everyone' OR c.interested_in = me.gender)
      -- Age range, both ways.
      AND (me.min_age_pref IS NULL OR c.age >= me.min_age_pref)
      AND (me.max_age_pref IS NULL OR c.age <= me.max_age_pref)
      AND (c.min_age_pref IS NULL OR me.age >= c.min_age_pref)
      AND (c.max_age_pref IS NULL OR me.age <= c.max_age_pref)
  ),

  signals AS (
    SELECT
      pool.*,
      ARRAY(
        SELECT DISTINCT lower(trim(i)) FROM unnest(COALESCE(pool.interests, '{}')) i
        WHERE trim(i) <> ''
      ) AS c_ints,
      ARRAY(
        SELECT i FROM unnest(COALESCE(pool.interests, '{}')) i
        WHERE lower(trim(i)) = ANY (me.ints)
      ) AS shared,
      (
        SELECT s.direction FROM public.swipes s
        WHERE s.swiper_id = pool.id AND s.swiped_id = me.id
      ) AS their_swipe,
      -- Likes this person has received and not yet answered either way.
      (
        SELECT COUNT(*) FROM public.swipes s
        WHERE s.swiped_id = pool.id
          AND s.direction IN ('right', 'super')
          AND NOT EXISTS (
            SELECT 1 FROM public.swipes r
            WHERE r.swiper_id = pool.id AND r.swiped_id = s.swiper_id
          )
      ) AS pending_likes,
      (
        0.5 * LEAST(COALESCE(cardinality(pool.photos), 0), 3) / 3.0
        + 0.3 * (COALESCE(trim(pool.bio), '') <> '')::INT
        + 0.2 * (COALESCE(cardinality(pool.interests), 0) > 0)::INT
      ) AS quality,
      1.0 - LEAST(ABS(pool.age - me.age), 10) / 10.0 AS age_fit,
      (me.loc IS NOT NULL AND me.loc = NULLIF(lower(trim(pool.location)), ''))::INT AS same_loc,
      -- 1.0 if active right now, ~0.37 after 3 days, ~0 after a few weeks.
      EXP(
        -GREATEST(EXTRACT(EPOCH FROM (NOW() - COALESCE(pool.last_active_at, pool.created_at))), 0)
        / (72 * 3600.0)
      ) AS activity,
      -- New-member boost that fades out over their first week.
      GREATEST(0.0, 1.0 - EXTRACT(EPOCH FROM (NOW() - pool.created_at)) / (7 * 86400.0)) AS newness,
      me.ints AS my_ints,
      me.quality AS my_quality
    FROM pool
    CROSS JOIN me
  ),

  scored AS (
    SELECT
      signals.*,
      -- Jaccard similarity of interests: shared / combined. 0 if either
      -- person listed none.
      CASE
        WHEN cardinality(my_ints) = 0 OR cardinality(c_ints) = 0 THEN 0.0
        ELSE cardinality(ARRAY(SELECT unnest(my_ints) INTERSECT SELECT unnest(c_ints)))::FLOAT
           / cardinality(ARRAY(SELECT unnest(my_ints) UNION SELECT unnest(c_ints)))
      END AS sim
    FROM signals
  ),

  directional AS (
    SELECT
      scored.*,
      -- How likely am I to like them?
      (0.45 * sim + 0.25 * quality + 0.15 * age_fit + 0.15 * same_loc) AS u_me,
      -- How likely are they to like me back? If they have already swiped we
      -- know; otherwise estimate it the same way from their side, plus
      -- whether they're around to swipe at all.
      CASE their_swipe
        WHEN 'super' THEN 1.0
        WHEN 'right' THEN 0.9
        -- They passed. Liking them can never become a match, so they sink
        -- to the bottom (not hidden: on a small campus the deck would feel
        -- empty, and hiding them would itself be a tell).
        WHEN 'left' THEN 0.02
        ELSE 0.35 * sim + 0.25 * my_quality + 0.15 * age_fit + 0.10 * same_loc + 0.15 * activity
      END AS u_them
    FROM scored
  ),

  ranked AS (
    SELECT
      directional.*,
      (
        0.55 * (2 * u_me * u_them / NULLIF(u_me + u_them, 0))  -- reciprocal (harmonic mean)
        + 0.20 * activity
        + 0.08 * newness
        + 0.08 * (their_swipe IN ('right', 'super'))::INT          -- a like back is a guaranteed match
        + 0.12 * random()
        - 0.10 * LEAST(LN(1 + pending_likes) / LN(51), 1)       -- attention balancing
        - 0.35 * is_bot::INT                                     -- real people before test bots
      ) AS score
    FROM directional
  )

  SELECT
    r.id, r.name, r.age, r.gender, r.interested_in, r.bio, r.location, r.occupation,
    r.interests, r.photos, r.instagram_url, r.spotify_url, r.is_verified, r.is_bot,
    r.created_at, r.updated_at,
    r.shared,
    COALESCE(r.their_swipe = 'super', FALSE)
  FROM ranked r
  ORDER BY r.score DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$;

REVOKE EXECUTE ON FUNCTION public.get_discover_profiles(INTEGER, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_discover_profiles(INTEGER, UUID[]) TO authenticated;
