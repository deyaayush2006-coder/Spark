-- ============================================================================
-- 002a — Auth rows for the bot profiles
-- Run this BEFORE database/002_seed_dummy_profiles.sql. Safe to re-run.
-- ============================================================================
--
-- WHY THIS FILE EXISTS
--
-- public.profiles.id is declared as:
--     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
--
-- ...so every profile row MUST have a matching row in auth.users. The seed
-- file (002) inserts ten bot profiles with hard-coded UUIDs that were never
-- created as auth users, so running 002 on its own fails immediately with:
--
--     ERROR: insert or update on table "profiles" violates foreign key
--            constraint "profiles_id_fkey"
--
-- The symptom in the browser is an empty Discover deck and no visible error:
-- the seed never landed, so there is nobody to swipe on.
--
-- These are placeholder accounts that exist only to satisfy the foreign key.
-- encrypted_password is set to a string that is not a valid bcrypt hash, so
-- no password can ever verify against it and nobody can sign in as a bot.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  bot.id::uuid,
  'authenticated',
  'authenticated',
  bot.email,
  -- Deliberately NOT a valid bcrypt hash: password login can never succeed.
  'BOT-ACCOUNT-NO-LOGIN',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', bot.name, 'is_bot', true)
FROM (VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'emma@bot.local',    'Emma Rose'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'sophia@bot.local',  'Sophia Chen'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'olivia@bot.local',  'Olivia Martinez'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'james@bot.local',   'James Wilson'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'michael@bot.local', 'Michael Brooks'),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'alex@bot.local',    'Alex Rivera'),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'david@bot.local',   'David Kim'),
  ('b8c9d0e1-f2a3-4567-bcde-678901234567', 'maya@bot.local',    'Maya Patel'),
  ('c9d0e1f2-a3b4-5678-cdef-789012345678', 'sarah@bot.local',   'Sarah Johnson'),
  ('d0e1f2a3-b4c5-6789-defa-890123456789', 'ryan@bot.local',    'Ryan O''Connor')
) AS bot(id, email, name)
ON CONFLICT (id) DO NOTHING;

-- Sanity check: fail loudly here rather than producing a confusing foreign
-- key error in 002.
DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM auth.users WHERE email LIKE '%@bot.local';
  IF n < 10 THEN
    RAISE EXCEPTION 'Expected 10 bot auth users, found %. Do not run 002 yet.', n;
  END IF;
  RAISE NOTICE 'OK: % bot auth users present. Now run 002_seed_dummy_profiles.sql', n;
END
$$;
