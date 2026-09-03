# Database

This folder is the "backend" data layer for Spark — schema, security policies,
and triggers, run directly in Supabase (SQL Editor or `supabase db push`).
There's no separate backend server: Supabase (Postgres + Auth + Storage +
Realtime) plays that role, and the Next.js app talks to it directly using
Row Level Security to enforce access control. The one place that needs real
server-side logic (see `app/api/bot-reply/route.ts`) uses a Next.js Route
Handler as a minimal backend endpoint.

## Setup order

**Brand new Supabase project:**
1. `001_create_schema.sql`
2. `002_seed_dummy_profiles.sql` (optional — adds bot profiles for testing)
3. `004_storage_setup.sql`

**Existing project that already ran the old `scripts/001_create_schema.sql`:**
1. `003_migration_fix_existing_deployment.sql`
2. `004_storage_setup.sql` (if you haven't already created the `profile-photos` bucket by hand)

Do not run `001` against a database that already has these tables with the
old column names — it will error on the `CREATE TABLE IF NOT EXISTS` no-ops
and skip the fixes. Use `003` instead.

## What changed from the original schema

The original `scripts/001_create_schema.sql` used column names
(`looking_for`, `profile_images`, `action`, `is_read`) that didn't match what
the app code actually queries (`interested_in`, `photos`, `direction`,
`read`). That meant profile creation, gender-preference filtering, and
unread-message counts were all silently broken. This schema renames the
columns to match the app instead of the other way around, since the app is
the larger surface to change.

It also adds:
- A trigger that creates a `matches` row when two users swipe right/super on
  each other. Nothing previously did this — the client only ever *checked*
  for a match, so the whole matching feature was non-functional.
- Removal of the client-facing `matches` INSERT policy, since matches are now
  only ever created by that trigger. Previously a client could `INSERT` a
  match row for themselves and any other user with just `auth.uid() =
  user1_id OR auth.uid() = user2_id`, which would have let anyone force a
  "match" (and by extension a chat) with a user who never liked them back.
- Column-level privilege lockdown on `profiles.email`, so it can't be read
  back by any client regardless of what a query selects. The app already
  gets the signed-in user's own email from Supabase Auth, so it never needed
  to read it from `profiles`.
- Length limits on bio/message content, and checks preventing self-swipes,
  self-matches, self-friend-requests, and self-follows.
- `004_storage_setup.sql` creates the `profile-photos` bucket the app
  uploads to. It never existed before, so every photo upload was silently
  falling back to storing the raw image as base64 text directly in the
  `profiles` table — that fallback has been removed from the app code (see
  the top-level README) since it had no size limit.
