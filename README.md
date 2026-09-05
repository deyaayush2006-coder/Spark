# Spark

A full-stack dating web app built for a single college campus. Swipe-based matching, real-time chat, and one-to-one video and voice calling.

Built with Next.js 16, Supabase, and LiveKit.

## Features

- **Profiles** — photos, bio, interests, occupation, and optional Instagram/Spotify links
- **Swipe matching** — like, pass, or super-like; a match is created only when both people like each other, enforced by a database trigger rather than client code
- **Mutual-preference discovery** — the deck only shows people whose stated preference includes you, so likes have a real chance of matching back
- **Real-time chat** — messages appear instantly via Supabase Realtime, no polling
- **Video and voice calls** — one-to-one calls between matches, powered by LiveKit
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

**Queries are batched.** Match summaries (last message and unread count for every match) are fetched in one SQL function using lateral joins, instead of a query per match.

## Setup

Requires a Supabase project and a LiveKit Cloud project (both have free tiers).

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Run the SQL files in `database/` in order in the Supabase SQL Editor.

**Note on Supabase keys:** the URL and both keys must come from the same project. A key from one project with a URL from another produces `Invalid API key` even though both values are valid on their own. `lib/env.ts` checks for this at startup.

## Status

Working prototype, not production-ready. Known gaps: no push notifications (calls only ring while the app is open), no account deletion, no photo moderation, and no rate limiting.

## License

MIT

