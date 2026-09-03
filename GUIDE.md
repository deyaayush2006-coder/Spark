# Spark — Code Review, Fixes, and Build Guide

Everything in the `spark-upgrade/` folder is a drop-in replacement or addition.
Copy the folder contents over your project root, preserving paths. Files that
replace an existing file are marked **(replaces)** below.

---

## 1. Your "Invalid API key" error — found it

This is worth reading carefully, because the cause is the kind of thing you can
stare at for a week.

Your `.env` contains:

| Variable | Supabase project it belongs to |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `xujdhyhbnrhylhwcyixs` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `izpuiysoplxtfdlhytwk` |
| `SUPABASE_SERVICE_ROLE_KEY` | `izpuiysoplxtfdlhytwk` |

A Supabase key is a JWT, and its payload contains a `ref` claim naming the
project it was issued for. Your URL points at one project and both your keys
were copied from a *different* one. Supabase checks that the key matches the
project in the URL, and when it doesn't, it returns exactly one thing:
`Invalid API key`.

So your instinct that "the APIs and everything was correct" was right — each
value **is** valid. They just don't belong together. You almost certainly
created a Supabase project, copied the keys, then deleted it and made a new one
(or had two open in different tabs) and only updated the URL.

**The fix:** open the one Supabase project you actually want. Go to
**Project Settings → API**. Copy the URL and *both* keys from that single page,
in one sitting, into `.env.local`. Then restart `npm run dev` — Next.js only
reads env files at startup, so editing them while the server is running does
nothing.

To stop this from ever costing you time again, I added **`lib/env.ts`**. It
decodes the keys locally (no network call, nothing logged) and, if the project
refs disagree, throws an error that says so in plain English instead of letting
you get `Invalid API key`. `lib/supabase/client.ts` **(replaces)** now calls it.

### Do this before anything else: rotate your service role key

Your `.env` is committed inside the zip you shared. The `SUPABASE_SERVICE_ROLE_KEY`
bypasses Row Level Security completely — anyone holding it can read and delete
every row in your database, including every user's email. Treat it as burned:

1. Supabase → Project Settings → API → **rotate/regenerate the service_role key**.
2. Delete `.env` from the repo and from git history:
   `git rm --cached .env && git commit -m "Remove committed env file"`.
   (If it has already been pushed to GitHub, rotating in step 1 is what actually
   protects you — removing the file afterwards doesn't un-publish it.)
3. Put your values in `.env.local` instead. Your `.gitignore` already ignores
   `.env*.local`. Use the provided `.env.example` as the template.

---

## 2. Other bugs I found and fixed

### Camera and microphone were disabled at the HTTP level — `next.config.mjs` **(replaces)**

Your config sent this header on every response:

```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

An empty allowlist `()` means "nobody, including this site". Video and voice
calls could not have worked no matter how good the client code was —
`getUserMedia()` would reject before the browser even showed a permission
prompt, and the error message browsers give for this is confusing. Changed to
`camera=(self), microphone=(self)`, which allows your own origin only.
Third-party iframes still can't reach the camera.

### The match modal could fire for the wrong person — `components/swipe-stack.tsx` **(replaces)**

The match lookup chained two `.or()` calls:

```ts
.or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
.or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
```

PostgREST combines repeated `or` params with AND, so this asks for "a match
involving me AND involving them" — but those can be satisfied by two *different*
match rows in a way that produces false positives, and `.single()` throws an
error whenever there's no match at all (the normal case). Your schema stores
matches as `LEAST(a,b), GREATEST(a,b)`, so the correct lookup is two exact
equality filters plus `.maybeSingle()`. Also fixed: a duplicate swipe (Postgres
error `23505`) no longer shows a scary "Failed to record swipe" toast, and the
card is removed from the stack immediately so a slow network can't let the same
profile be swiped twice.

### Discovery ignored the other person's preference — `app/(app)/discover/page.tsx` **(replaces)**

You filtered on "show me people of the gender I'm interested in" but never on
"…who are also interested in my gender". So a straight man would be shown
lesbian profiles, like them, and never match. Matching would look mysteriously
broken while every individual piece worked. Added the reciprocal filter, plus
exclusion of people you've blocked, plus quoting of UUIDs inside the PostgREST
`in` list (unquoted values fail *silently*, returning an empty deck).

### Realtime chat broke in a second tab — `components/chat-room.tsx` **(replaces)**

The subscription ignored any incoming message where `sender_id === currentUserId`.
That prevented double-appends, but it also meant the same account open in two
tabs never saw its own messages in the second one. Now de-duplicated by message
`id`, which handles both cases.

### `Profile` type was missing `is_verified` — `lib/types.ts` **(replaces)**

The column exists in your schema and every query selects it, but the TypeScript
interface didn't list it, so any code touching `profile.is_verified` would fail
to compile. Also added `Call`, `Block`, `Report`, and `is_active` on `Match`.

### The Matches page fired 81 queries per load — `app/(app)/matches/page.tsx` **(replaces)**, `database/006_match_summaries.sql` **(new)**

For each match it ran two more queries, in a loop: one for the last message,
one for the unread count. With 40 matches that's 81 round trips to Supabase on
every page load. This is the classic N+1 query problem, and it's the most common
reason a page feels instant with three test users and unusable with three
hundred real ones.

It also used `.single()` for the last message, which throws whenever a match has
no messages yet — i.e. every brand-new match, the exact moment the page matters
most.

`database/006` adds a `get_match_summaries()` SQL function that does all of it
in one query using LATERAL joins, plus two supporting indexes. The page is now
two queries total regardless of how many matches you have. The function is
`SECURITY INVOKER`, so RLS still applies exactly as before — this is the same
data, fetched sensibly, not a privilege escalation.

### `crypto.randomUUID()` would crash on a phone — `components/call-buttons.tsx`

Caught this while reviewing my own code. `crypto.randomUUID()` only exists in a
*secure context*: HTTPS, or `localhost`. Testing on your phone at
`http://192.168.1.x:3000` would have thrown. Added a `getRandomValues` fallback.

Worth knowing generally, because `getUserMedia()` has the same restriction:
**you cannot test camera or microphone over plain HTTP on a LAN address.** For
phone testing, either deploy to Vercel (HTTPS free) or run a tunnel like
`npx localtunnel --port 3000`.

---

## 2b. What I could and couldn't verify

Being straight about this, since "test the app" has limits in a sandbox with no
network access:

**Ran and passed:**

- `tsc --noEmit` across all 104 source files with every patch applied. Clean.
  The only remaining errors are `Cannot find module 'livekit-*'`, which
  disappear after `npm install`.
- An import-resolution check over all 189 internal (`@/...` and relative)
  imports. All resolve to real files — no missing components or typo'd paths.
- Six unit tests against `lib/env.ts`, using synthetic keys rather than your
  real ones. It correctly flags your exact `.env` shape (URL and key from
  different projects), an anon/service key swap, and a missing key; and
  correctly stays quiet for a valid config, a trailing slash on the URL, and
  the newer `sb_publishable_` key format. 6/6.

**Could not run:**

- `next build` — it downloads a platform-specific SWC binary from npm on first
  run, and this sandbox has no network egress. Run it yourself; it's the real
  gate before deploying.
- The app itself. Every page is a Server Component that calls Supabase over the
  network, so there's nothing to exercise without a live project.
- The SQL. No Postgres here. Run each file in the Supabase SQL Editor and read
  the output — if `005` or `006` errors, nothing after that line executed.

So: the code compiles and the wiring is sound. Runtime behaviour against a live
Supabase and LiveKit project is still unverified, and that's the next thing you
should do.

---

## 3. Adding video and voice calls

### Why LiveKit rather than raw WebRTC

Raw WebRTC in a browser sounds appealing because it's "free", and for a demo on
one campus Wi-Fi network it works. The problem is that peer-to-peer connections
fail whenever both users are behind restrictive NATs — hostel networks, college
firewalls, and most mobile carriers. Roughly 15–20% of real-world calls need a
TURN relay server to work at all, and running TURN means running a server with
real bandwidth costs. You would spend weeks on it and still get calls that fail
for a fifth of your users, which for a dating app reads as "the app is broken".

LiveKit is an open-source WebRTC platform that handles all of that. Its managed
Cloud Build tier is free and includes 5,000 WebRTC minutes and 50 GB of egress per month. A one-to-one call
consumes two participant-minutes per minute, so that's around 2,500 minutes of
calling a month — comfortable for a college launch. If you outgrow it, the open-source server is free to self-host under Apache 2.0, and you can switch without changing your client code.

### Setup

```bash
npm install livekit-server-sdk @livekit/components-react @livekit/components-styles livekit-client
```

Sign up at `https://cloud.livekit.io`, create a project, go to **Settings → Keys**,
and add to `.env.local`:

```
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

Then run `database/005_calls_blocks_reports.sql` in the Supabase SQL Editor.

### How the calling flow works

There is no separate signalling server. The `calls` table *is* the signalling
channel, which is the main design decision here and worth understanding:

1. **A presses the video button.** `CallButtons` first requests camera/mic
   permission locally — if it's denied, nothing happens and B is never
   disturbed. Then it inserts a `calls` row with `status = 'ringing'` and a
   fresh random `room_name`.
2. **B's browser rings.** `IncomingCallListener` is mounted once in the app
   layout and subscribes to Supabase Realtime for INSERTs on `calls` where
   `callee_id` is B. The new row *is* the notification. B sees an accept/decline
   modal over whatever page they're on.
3. **B accepts.** The row flips to `status = 'accepted'`, and both browsers
   navigate to `/matches/[id]/call/[callId]`.
4. **Both request a token.** `POST /api/livekit-token` checks the session, loads
   the call row (RLS already limits this to the two participants), and mints a
   15-minute LiveKit token scoped to that one room.
5. **Hanging up** flips the row to `ended`, which the other side sees over
   Realtime and leaves too. Unanswered calls time out at 45 seconds as `missed`.

The security detail that matters: **the room name comes from the database row,
never from the request body.** If the client could name the room, anyone could
request a token for any room and drop into a stranger's video call. Same reason
the LiveKit API secret only ever lives on the server.

### Known limitation

Calls only ring while the app is open in a browser tab. Ringing a closed app
needs Web Push plus a service worker plus VAPID keys — a genuinely large feature.
Ship without it; "call while you're both in the chat" is a normal and
understandable behaviour for a v1.

---

## 4. Safety features — please don't skip these

I added blocking and reporting (`database/005`, `app/api/report/route.ts`,
`components/report-menu.tsx`, now wired into the chat header). This isn't
polish. You are about to hand a stranger-messaging tool to people who will run
into each other in the canteen tomorrow, and the first serious harassment
incident will happen sooner than you expect.

What's enforced in the database, not just the UI:

- A blocked pair cannot send messages to each other (the `messages_insert_own`
  RLS policy now checks `is_blocked_pair`).
- A blocked pair cannot start a call (the `calls_insert_caller` policy).
- Blocks are invisible to the blocked person — they aren't told. Telling someone
  they've been blocked reliably escalates the situation.
- Reports are insert-only for users. Nobody, including the reporter, can read
  them back, so a reported user can't probe whether they were reported. Read
  them in the Supabase dashboard: `select * from reports where status = 'open'`.

Still missing, in rough priority order:

1. **An unmatch button.** Blocking is the nuclear option; people also just want
   to end a conversation. Add `is_active = false` on the match.
2. **College-email-only signup.** Restricting to `@yourcollege.edu` addresses is
   your single strongest anti-abuse measure and it's about ten lines of code.
   It also solves the "is this person actually a student" problem for free.
3. **Photo moderation.** Even a manual review queue before a photo goes live
   beats nothing. Your `is_verified` column is a good place to hang this.
4. **Rate limiting** on messages and calls, so one person can't spam fifty
   matches or repeatedly ring someone who declined.
5. **A visible way to reach a human.** A real email address in the app that a
   student can write to when something goes wrong.

Two things that are not code:

- **Age.** Your schema enforces `age >= 18`, but a self-declared number is not
  age verification. Given some of your users may be 17, decide deliberately how
  you're handling that, and put it in writing.
- **Privacy.** You're storing photos, locations, sexual orientation, and private
  messages about identifiable students. If you're in India, that's sensitive
  personal data under the DPDP Act. Before you launch, talk to whoever runs
  student affairs or IT at your college. Getting institutional sign-on early is
  much easier than explaining it afterwards, and they may well host it for you.

---

## 5. About "commercial industry level"

I want to be straight with you, because it'll save you frustration: the gap
between what you have and Tinder is not mostly features. It's the boring
infrastructure underneath — abuse handling, moderation staffing, payments and
tax, fraud detection, on-call rotations, GDPR/DPDP compliance, app store
review. Tinder has hundreds of engineers on that.

What you *can* build, and what would be genuinely impressive, is an excellent
dating app for one campus. That's a real product with a real advantage a big
app doesn't have: everyone's a verified student at the same college. Lean into
that. Build for 500 students, not 500,000.

A staged plan that matches your skill level:

**Stage 1 — make what exists actually work (1–2 weeks).**
Fix the env keys. Apply these patches. Run all the SQL. Create three test
accounts, and manually walk through: sign up → build a profile → swipe → match
→ chat → call → block → report. Write down every rough edge. Fix them. Don't
add features yet.

**Stage 2 — the missing basics (2–3 weeks).**
Unmatch. College email restriction. Profile editing that actually persists.
Deleting your account (legally required, and you don't have it). Empty states
and loading states everywhere. Test the whole thing on a real phone on mobile
data, not just your laptop.

**Stage 3 — closed beta (2 weeks).**
Twenty friends. Watch them use it in person without helping. You will learn more
in one afternoon of this than in a month of building.

**Stage 4 — things that make it feel good.**
Push notifications. Better discovery ranking (recency and activity, not just
`created_at DESC`). Photo verification. Prompts instead of a blank bio box —
Hinge's whole product is really just good prompts, and prompts are much cheaper
to build than a matching algorithm.

Things to deliberately *not* build for a long time: payments and premium tiers,
native mobile apps, a machine-learning matching algorithm, group video, stories.
Every one of them is a month of work that won't change whether students use it.

---

## 6. Learning notes, since you're new to this

A few things that will make the next few months go better:

**Read the errors properly.** Your `Invalid API key` bug was fully diagnosable
from the data you had — a Supabase key is a JWT, and you can paste it into
jwt.io to see which project it belongs to. When something says "invalid",
ask "invalid *how*, and what exactly is being compared to what?" before
changing code.

**Learn Row Level Security properly.** It's the single most important concept in
this codebase. Your existing policies are genuinely good — matches can only be
created by a database trigger, so a malicious client can't fabricate a match
with someone who never liked them. That's a real security property, and it's
enforced in the database where it can't be bypassed by anyone calling your API
directly. Understand why that's stronger than checking in your React code.

**Treat the database as the source of truth for rules.** Every rule I added
(blocks, call authorisation, call timestamps) lives in SQL, not in components.
UI checks are for user experience; database checks are for security. If you only
have one, make it the database one.

**Don't paste code you don't understand.** Including mine. Go through
`components/call-room.tsx` and `app/api/livekit-token/route.ts` line by line
and make sure you could explain each part. When something breaks at 2am before
your demo, understanding beats having more code.

---

## File manifest

| Path | Status |
| --- | --- |
| `database/005_calls_blocks_reports.sql` | new — run in Supabase SQL Editor |
| `.env.example` | new |
| `lib/env.ts` | new |
| `lib/supabase/client.ts` | replaces |
| `lib/types.ts` | replaces |
| `next.config.mjs` | replaces |
| `app/(app)/layout.tsx` | replaces |
| `app/(app)/discover/page.tsx` | replaces |
| `app/(app)/matches/page.tsx` | replaces |
| `database/006_match_summaries.sql` | new — run after 005 |
| `components/chat-room.tsx` | replaces |
| `components/swipe-stack.tsx` | replaces |
| `app/api/livekit-token/route.ts` | new |
| `app/api/report/route.ts` | new |
| `app/(app)/matches/[id]/call/[callId]/page.tsx` | new |
| `components/call-room.tsx` | new |
| `components/call-buttons.tsx` | new |
| `components/incoming-call-listener.tsx` | new |
| `components/report-menu.tsx` | new |
