# Spark

A full-stack dating web app built for a single college campus. Swipe-based matching, real-time chat, and one-to-one video and voice calling.

Built with Next.js 16, Supabase, and LiveKit.

## Features

- **Profiles** — photos, bio, interests, occupation, and optional Instagram/Spotify links
- **Swipe matching** — like, pass, or super-like; a match is created only when both people like each other, enforced by a database trigger rather than client code
- **Mutual-preference discovery** — the deck only shows people whose stated preference includes you, so likes have a real chance of matching back
- **Real-time chat** — messages appear instantly via Supabase Realtime, no polling
- **Video and voice calls** — one-to-one calls between matches, powered by LiveKit, that ring the other person's phone even when Spark is closed (Web Push)
- **Ranked discovery** — the deck is ordered by two-way compatibility, recent activity, and who already liked you, with mutual age-range and gender dealbreakers
- **Safety** — block and report, enforced at the database level: a blocked pair cannot message or call each other even through direct API access

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components) |
| Language | TypeScript |
| Database & auth | Supabase (Postgres, Row Level Security) |
| Realtime | Supabase Realtime |
| Calling | LiveKit |
| UI | Tailwind CSS, Radix UI, shadcn/ui |

## Architecture notes

**Security lives in the database, not the UI.** Every rule that matters is a Row Level Security policy or a trigger. Matches can only be created by a trigger when two likes exist, so a client can't fabricate a match. Blocks are enforced in the insert policies for both messages and calls.

**Calls need no signalling server.** The `calls` table doubles as the signalling channel: a new row with `status = 'ringing'` arrives at the callee over Supabase Realtime, and that *is* the incoming-call notification. LiveKit tokens are minted server-side, scoped to a single room, and the room name comes from the database row rather than the request body — so a token can't be used to join someone else's call.

**Ringing has four independent paths.** A Realtime INSERT event, a 3-second poll of `get_incoming_call()` (which judges staleness by the database clock, not the phone's), an immediate re-check when the app returns to the foreground, and a Web Push notification from `public/sw.js` for when the app is closed or the phone is locked. Only the last one can reach someone who isn't looking at Spark, which is why "calls only worked between my own two devices".

**Discovery is a reciprocal recommender.** `get_discover_profiles()` estimates "would I like them" and "would they like me back" separately and combines them with a harmonic mean, so a card only ranks high when both directions do — the approach behind Hinge's Most Compatible and the RECON research system. On top of that: activity (Tinder's biggest lever), a boost for people who already liked you, a gentle penalty for people buried in unanswered likes so attention spreads around, and a little randomness.

**Queries are batched.** Match summaries (last message and unread count for every match) are fetched in one SQL function using lateral joins, instead of a query per match.

## Setup

Requires a Supabase project and a LiveKit Cloud project (both have free tiers).

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npx web-push generate-vapid-keys   # paste into the VAPID_* lines
npm run dev
```

Run the SQL files in `database/` in order in the Supabase SQL Editor (see `database/README.md`). Add the same env vars to your Vercel project before deploying.

### Calling checklist

If calls work between your own devices but not with someone else, check these in order:

1. **`NEXT_PUBLIC_LIVEKIT_URL` is a LiveKit Cloud `wss://…livekit.cloud` URL.** A local server (`livekit-server --dev`, `ws://localhost`, `ws://192.168.x.x`) is only reachable from your own Wi-Fi. The token route now refuses such a URL in production and says why.
2. **The other person turned on call alerts.** Without them a call can only ring while Spark is open on their screen. The Matches page shows a "Don't miss calls" card until they do.
3. **On iPhone, Spark is on the Home Screen.** iOS only delivers Web Push to installed web apps (iOS 16.4+): Share → Add to Home Screen, open it from there, then turn on call alerts.
4. **`database/008_reliable_calls_and_push.sql` has been run.** Without it calls still ring in-app, but with the old phone-clock check and no push.
5. **The app is opened over `https://`.** Browsers hide the camera and microphone on plain `http://` LAN addresses.

**Note on Supabase keys:** the URL and both keys must come from the same project. A key from one project with a URL from another produces `Invalid API key` even though both values are valid on their own. `lib/env.ts` checks for this at startup.

## Status

Working prototype, not production-ready. Known gaps: no account deletion, no photo moderation, and no rate limiting. Call alerts need the user to opt in, and on iPhone to install the app first.

## License

MIT

