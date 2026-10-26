-- ============================================================================
-- 008 — Reliable ringing + Web Push call alerts
-- Run AFTER 005, 006 and 007. Safe to re-run.
-- ============================================================================
--
-- WHY THIS EXISTS
--
-- Before this file, an incoming call only "rang" if the callee had Spark open
-- in a visible tab at the exact moment the call started. Anyone whose phone
-- was locked, who had switched to WhatsApp, or who simply had the tab in the
-- background never saw anything. That is why calls worked between two of
-- your own devices sitting side by side and failed with anyone far away:
-- your devices were open and in front of you, theirs weren't.
--
-- It also decided whether a call was "too old to ring" using the CALLEE'S
-- device clock. A phone or laptop whose clock was a minute ahead silently
-- ignored every call.
--
-- This file:
--   1. Makes the database clock the only clock that matters for ringing.
--   2. Self-heals calls left 'ringing' forever by a caller whose tab died.
--   3. Tightens which participant may move a call to which status.
--   4. Adds the storage the server needs to send Web Push notifications, so
--      a call can ring a locked phone or a closed tab.


-- ============================================================================
-- 1. REALTIME — make sure calls is published, with full rows on UPDATE
-- ============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- With RLS on, UPDATE events are only delivered reliably when the whole row
-- is written to the WAL. Without this the "caller hung up" event can arrive
-- missing the columns the callee's policy check needs.
ALTER TABLE public.calls REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_calls_caller_status ON public.calls(caller_id, status);


-- ============================================================================
-- 2. SERVER-ONLY BOOKKEEPING COLUMNS
-- ============================================================================
-- Set by app/api/calls/[id]/notify with the service-role key so each call
-- produces at most one "incoming call" push and one "missed call" push, no
-- matter how many times a client hits the endpoint.

ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS ring_notified_at TIMESTAMPTZ;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS missed_notified_at TIMESTAMPTZ;

-- Re-assert the column lockdown from 007 so this file is safe even where 007
-- was never run: clients may only ever write `status`. In particular they
-- must not be able to null out ring_notified_at and spam someone's phone.
REVOKE UPDATE ON public.calls FROM anon, authenticated;
GRANT UPDATE (status) ON public.calls TO authenticated;


-- ============================================================================
-- 3. STATUS TRANSITIONS
-- ============================================================================
-- Replaces the trigger from 005. Same timestamp stamping, plus rules about
-- who may do what. Invalid transitions are ignored (the row keeps its old
-- status) rather than raising, matching 005's behaviour, so a late click on
-- "Accept" after the caller gave up does nothing instead of erroring.
--
--   ringing  -> accepted | declined   only the callee
--   ringing  -> missed                either side (timeout / caller cancels)
--   ringing | accepted -> ended       either side
--   declined | ended | missed         terminal, never change again
--
-- auth.uid() is NULL for the service-role key, which may do anything.

CREATE OR REPLACE FUNCTION public.stamp_call_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('declined', 'ended', 'missed') THEN
    NEW.status := OLD.status;
  ELSIF NEW.status = 'ringing' AND OLD.status <> 'ringing' THEN
    NEW.status := OLD.status;
  ELSIF NEW.status IN ('accepted', 'declined', 'missed') AND OLD.status <> 'ringing' THEN
    -- e.g. the caller's 45s timer firing a moment after the callee answered
    -- must not kill a call that is already connected.
    NEW.status := OLD.status;
  ELSIF NEW.status IN ('accepted', 'declined')
        AND auth.uid() IS NOT NULL
        AND auth.uid() <> OLD.callee_id THEN
    -- The caller cannot answer their own call.
    NEW.status := OLD.status;
  END IF;

  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    NEW.answered_at := NOW();
  END IF;
  IF NEW.status IN ('declined', 'ended', 'missed') AND OLD.ended_at IS NULL THEN
    NEW.ended_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_call_timestamps ON public.calls;
CREATE TRIGGER trg_stamp_call_timestamps
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.stamp_call_timestamps();


-- ============================================================================
-- 4. "IS ANYONE CALLING ME?" — answered by the database clock
-- ============================================================================
-- Polled every few seconds by components/incoming-call-listener.tsx, and run
-- whenever the app comes back to the foreground.
--
-- It first expires this user's stale ringing calls (both directions), so a
-- caller who closed their tab mid-ring can't leave a ghost call that rings
-- the next time the callee opens the app. Then it returns the newest live
-- call, with the caller's name and photo, in one round trip.
--
-- SECURITY INVOKER: runs with the caller's own RLS, so it can only ever see
-- or touch calls this user is part of.

CREATE OR REPLACE FUNCTION public.get_incoming_call()
RETURNS TABLE (
  id UUID,
  match_id UUID,
  caller_id UUID,
  kind TEXT,
  created_at TIMESTAMPTZ,
  caller_name TEXT,
  caller_photo TEXT
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  UPDATE public.calls c
     SET status = 'missed'
   WHERE c.status = 'ringing'
     AND c.created_at < NOW() - INTERVAL '60 seconds'
     AND (c.caller_id = auth.uid() OR c.callee_id = auth.uid());

  RETURN QUERY
  SELECT c.id, c.match_id, c.caller_id, c.kind, c.created_at, p.name, p.photos[1]
  FROM public.calls c
  JOIN public.profiles p ON p.id = c.caller_id
  WHERE c.callee_id = auth.uid()
    AND c.status = 'ringing'
    AND c.created_at >= NOW() - INTERVAL '60 seconds'
    AND NOT public.is_blocked_pair(c.caller_id, c.callee_id)
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_incoming_call() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_incoming_call() TO authenticated;


-- ============================================================================
-- 5. WEB PUSH SUBSCRIPTIONS
-- ============================================================================
-- One row per browser/device that agreed to receive call alerts. Holds the
-- push service endpoint plus the two keys the server needs to encrypt a
-- message for that browser.
--
-- No RLS policies on purpose: only server routes using the service-role key
-- read or write this table (app/api/push/subscribe, app/api/calls/[id]/notify).
-- A client has no reason to read anyone's endpoint, including its own.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (char_length(endpoint) <= 2048),
  p256dh TEXT NOT NULL CHECK (char_length(p256dh) <= 256),
  auth TEXT NOT NULL CHECK (char_length(auth) <= 256),
  user_agent TEXT CHECK (char_length(user_agent) <= 512),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
