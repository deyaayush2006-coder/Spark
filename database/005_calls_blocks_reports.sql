-- ============================================================================
-- 005 — Calls, Blocks and Reports
-- Run AFTER 001_create_schema.sql (and 003 if you had an older deployment).
-- Safe to re-run: everything is IF NOT EXISTS / OR REPLACE / DROP-then-CREATE.
-- ============================================================================


-- ============================================================================
-- BLOCKS  (must exist before calls, because the call policies reference it)
-- ============================================================================
-- A block is one-directional in storage but enforced in both directions:
-- if A blocks B, neither can message or call the other.

CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- You can only see and manage blocks you created. Deliberately NOT visible to
-- the blocked person — being told "X blocked you" is a safety problem.
DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
CREATE POLICY "blocks_select_own" ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
CREATE POLICY "blocks_insert_own" ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;
CREATE POLICY "blocks_delete_own" ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Helper used by several policies below. SECURITY DEFINER so it can read the
-- whole blocks table (not just the caller's own rows) without leaking who
-- blocked whom — it only ever returns a boolean.
CREATE OR REPLACE FUNCTION public.is_blocked_pair(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;


-- ============================================================================
-- REPORTS
-- ============================================================================
-- Every real dating product needs this. Reports are write-only for users:
-- you can file one, you can't read anyone else's (including your own back,
-- which stops a reported user from probing whether they were reported).
-- Review them in the Supabase dashboard, or build an admin page later.

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'harassment', 'inappropriate_photos', 'spam_or_scam',
    'fake_profile', 'underage', 'other'
  )),
  details TEXT CHECK (char_length(details) <= 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (reporter_id <> reported_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
-- No SELECT/UPDATE/DELETE policy at all: only the service_role key (server
-- routes) and the Supabase dashboard can read or triage reports.


-- ============================================================================
-- CALLS
-- ============================================================================
-- One row per call attempt. This table doubles as the ringing/signalling
-- channel: the callee's browser subscribes to Realtime INSERTs filtered on
-- callee_id, so a new 'ringing' row IS the incoming-call notification.
-- No custom WebSocket server needed.
--
-- room_name is per-call (not per-match) so a LiveKit token minted for one
-- call can never be replayed to silently join a later, different call.

CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing'
    CHECK (status IN ('ringing', 'accepted', 'declined', 'ended', 'missed')),
  room_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  CHECK (caller_id <> callee_id)
);

CREATE INDEX IF NOT EXISTS idx_calls_callee_status ON public.calls(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_match ON public.calls(match_id);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Only the two people on the call can see it.
DROP POLICY IF EXISTS "calls_select_participant" ON public.calls;
CREATE POLICY "calls_select_participant" ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- You can only start a call as yourself, to someone you are actually matched
-- with, who hasn't blocked you (and whom you haven't blocked).
DROP POLICY IF EXISTS "calls_insert_caller" ON public.calls;
CREATE POLICY "calls_insert_caller" ON public.calls FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id
    AND status = 'ringing'
    AND NOT public.is_blocked_pair(caller_id, callee_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND m.is_active
        AND (
          (m.user1_id = caller_id AND m.user2_id = callee_id) OR
          (m.user2_id = caller_id AND m.user1_id = callee_id)
        )
    )
  );

-- Either participant can move the call forward (accept / decline / end).
DROP POLICY IF EXISTS "calls_update_participant" ON public.calls;
CREATE POLICY "calls_update_participant" ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Stamp the timestamps server-side so clients can't lie about call duration.
CREATE OR REPLACE FUNCTION public.stamp_call_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    NEW.answered_at := NOW();
  END IF;
  IF NEW.status IN ('declined', 'ended', 'missed') AND OLD.ended_at IS NULL THEN
    NEW.ended_at := NOW();
  END IF;
  -- A call can never go backwards out of a terminal state.
  IF OLD.status IN ('declined', 'ended', 'missed') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_call_timestamps ON public.calls;
CREATE TRIGGER trg_stamp_call_timestamps
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.stamp_call_timestamps();


-- ============================================================================
-- ENFORCE BLOCKS ON MESSAGING
-- ============================================================================
-- Replaces the messages_insert_own policy from 001 with one that also refuses
-- inserts between blocked pairs. (Recreated, not altered, so this file is
-- self-contained.)

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
        AND NOT public.is_blocked_pair(m.user1_id, m.user2_id)
    )
  );


-- ============================================================================
-- REALTIME
-- ============================================================================
-- Adding `calls` to the publication is what makes ringing work. Wrapped in a
-- DO block because ADD TABLE errors if the table is already published.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
