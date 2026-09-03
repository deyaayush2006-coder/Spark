-- Spark Dating App — Database Schema
-- Run this once against a fresh Supabase project (SQL Editor, or `supabase db push`).
-- If you already ran the old scripts/001_create_schema.sql against a live project,
-- use database/003_migration_fix_existing_deployment.sql instead — do NOT re-run this file there.

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (extends auth.users)
-- NOTE: column names below match what the app code actually queries
-- (interested_in / photos / read), not the earlier mismatched schema.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT NOT NULL,
  bio TEXT CHECK (char_length(bio) <= 500),
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 120),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
  interested_in TEXT NOT NULL CHECK (interested_in IN ('male', 'female', 'everyone')),
  location TEXT,
  occupation TEXT,
  interests TEXT[],
  instagram_url TEXT,
  spotify_url TEXT,
  photos TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Swipes table (like/dislike/super-like actions)
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'super')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id),
  CHECK (swiper_id <> swiped_id)
);

-- Matches table (created ONLY by the trigger below, never by the client)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id <> user2_id)
);

-- Messages table (chat between matched users)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friend requests table (social feature)
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);

-- Followers table (social feature)
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON public.swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON public.swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_interested_in ON public.profiles(interested_in);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Profiles: any signed-in user can browse rows (needed for discovery), but
-- see the GRANT/REVOKE block below — the `email` column is locked down
-- separately at the column-privilege level, independent of this row policy.
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Swipes: users can only see/manage their own swipes
CREATE POLICY "swipes_select_own" ON public.swipes FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY "swipes_insert_own" ON public.swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);
CREATE POLICY "swipes_delete_own" ON public.swipes FOR DELETE USING (auth.uid() = swiper_id);
-- (No update policy: a swipe direction shouldn't be editable after the fact.)

-- Matches: users can only SEE their own matches. There is deliberately NO
-- insert/update/delete policy for regular clients — rows are created only by
-- the SECURITY DEFINER trigger below, so a client can never fabricate a match
-- with someone who never liked them back.
CREATE POLICY "matches_select_own" ON public.matches FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages: only match participants can read; only the authenticated sender
-- can insert as themselves; only participants can mark messages read.
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- Friend requests
CREATE POLICY "friend_requests_select_own" ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "friend_requests_insert_own" ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "friend_requests_update_receiver" ON public.friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Followers
CREATE POLICY "followers_select_all" ON public.followers FOR SELECT USING (true);
CREATE POLICY "followers_insert_own" ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_delete_own" ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- COLUMN-LEVEL PRIVACY: lock down profiles.email
-- ============================================================================
-- Row-level security only controls which ROWS are visible, not which COLUMNS.
-- profiles_select_all (USING true) is needed so people can browse each
-- other's name/photos/bio, but that would also expose every user's email to
-- every other signed-in (or even anonymous) client via `select('*')`.
-- The app already gets the current user's own email from Supabase Auth
-- (auth.getUser()), so it never needs to read it back out of `profiles`.
-- Revoking column privileges enforces this at the database level, regardless
-- of what any client or future code path selects.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, name, age, gender, interested_in, bio, location, occupation, interests,
  photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at
) ON public.profiles TO anon, authenticated;
-- INSERT/UPDATE still go through the columns the app actually writes; email
-- is populated once via the trigger below and never edited by the client.
GRANT INSERT (
  id, name, age, gender, interested_in, bio, location, occupation, interests,
  photos, instagram_url, spotify_url, is_bot
) ON public.profiles TO authenticated;
GRANT UPDATE (
  name, bio, location, occupation, interests, photos, instagram_url,
  spotify_url, updated_at
) ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-fill profiles.email from auth.users so the client never needs to (and
-- never has the privilege to) write it directly.
CREATE OR REPLACE FUNCTION public.set_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_email ON public.profiles;
CREATE TRIGGER trg_set_profile_email
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_email();

-- Auto-create a match when two users have both swiped right/super on each
-- other. This used to be missing entirely (the client only ever checked for
-- a match, it never created one), so matching silently never worked. Doing
-- it here as a SECURITY DEFINER trigger also means it's the only way a match
-- row can ever be created — a client can no longer insert a fake match with
-- someone who never liked them back.
CREATE OR REPLACE FUNCTION public.create_match_on_mutual_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reciprocal_exists BOOLEAN;
BEGIN
  IF NEW.direction NOT IN ('right', 'super') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
    AND swiped_id = NEW.swiper_id
    AND direction IN ('right', 'super')
  ) INTO reciprocal_exists;

  IF reciprocal_exists THEN
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (
      LEAST(NEW.swiper_id, NEW.swiped_id),
      GREATEST(NEW.swiper_id, NEW.swiped_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_match_on_mutual_like ON public.swipes;
CREATE TRIGGER trg_create_match_on_mutual_like
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_like();

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
