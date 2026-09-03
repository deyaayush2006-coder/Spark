-- Migration for a Supabase project that already ran the OLD scripts/001_create_schema.sql.
-- Safe to run once; every step is idempotent-ish (guarded), but back up first.
-- Skip this file entirely on a brand-new project — just run 001 + 002 instead.

-- 1. Rename columns to match what the app actually queries
ALTER TABLE public.profiles RENAME COLUMN looking_for TO interested_in;
ALTER TABLE public.profiles RENAME COLUMN profile_images TO photos;
ALTER TABLE public.swipes RENAME COLUMN action TO direction;
ALTER TABLE public.messages RENAME COLUMN is_read TO read;

-- 2. Fix the swipes CHECK constraint values (old: like/dislike/super_like, app uses left/right/super)
ALTER TABLE public.swipes DROP CONSTRAINT IF EXISTS swipes_action_check;
UPDATE public.swipes SET direction = CASE direction
  WHEN 'like' THEN 'right'
  WHEN 'dislike' THEN 'left'
  WHEN 'super_like' THEN 'super'
  ELSE direction
END
WHERE direction IN ('like', 'dislike', 'super_like');
ALTER TABLE public.swipes ADD CONSTRAINT swipes_direction_check
  CHECK (direction IN ('left', 'right', 'super'));
ALTER TABLE public.swipes ADD CONSTRAINT swipes_no_self_swipe CHECK (swiper_id <> swiped_id);

-- 3. Length limits that were missing before
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 500);
ALTER TABLE public.messages ADD CONSTRAINT messages_content_length
  CHECK (char_length(content) > 0 AND char_length(content) <= 2000);
ALTER TABLE public.matches ADD CONSTRAINT matches_no_self_match CHECK (user1_id <> user2_id);
ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_no_self CHECK (sender_id <> receiver_id);
ALTER TABLE public.followers ADD CONSTRAINT followers_no_self_follow CHECK (follower_id <> following_id);

-- 4. Remove the insecure client-facing INSERT policy on matches — matches
--    are created only by the trigger from here on.
DROP POLICY IF EXISTS "matches_insert" ON public.matches;

-- 5. Tighten the messages insert policy to also require match membership
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- 6. Drop the old swipes_update_own policy (direction shouldn't be edited after the fact)
DROP POLICY IF EXISTS "swipes_update_own" ON public.swipes;

-- 7. Lock down profiles.email at the column-privilege level (see 001 for rationale)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, name, age, gender, interested_in, bio, location, occupation, interests,
  photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at
) ON public.profiles TO anon, authenticated;
GRANT INSERT (
  id, name, age, gender, interested_in, bio, location, occupation, interests,
  photos, instagram_url, spotify_url, is_bot
) ON public.profiles TO authenticated;
GRANT UPDATE (
  name, bio, location, occupation, interests, photos, instagram_url,
  spotify_url, updated_at
) ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

-- 8. Add the email auto-fill trigger
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

-- 9. Add the match-on-mutual-like trigger (this is the fix for matching
--    never having worked — nothing previously ever inserted into `matches`)
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
    VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_match_on_mutual_like ON public.swipes;
CREATE TRIGGER trg_create_match_on_mutual_like
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_like();

-- 10. Backfill: create matches for any mutual likes that already exist from
--     before this migration (since the trigger only fires on new inserts).
INSERT INTO public.matches (user1_id, user2_id)
SELECT LEAST(s1.swiper_id, s1.swiped_id), GREATEST(s1.swiper_id, s1.swiped_id)
FROM public.swipes s1
JOIN public.swipes s2
  ON s1.swiper_id = s2.swiped_id AND s1.swiped_id = s2.swiper_id
WHERE s1.direction IN ('right', 'super') AND s2.direction IN ('right', 'super')
ON CONFLICT (user1_id, user2_id) DO NOTHING;
