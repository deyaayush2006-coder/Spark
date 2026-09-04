-- ============================================================================
-- 007 — Stop one participant from rewriting the other's messages
-- Run AFTER 005. Safe to re-run.
-- ============================================================================
--
-- THE PROBLEM
--
-- 001 created this policy so that opening a chat can mark incoming messages
-- as read:
--
--   CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE
--     USING (EXISTS (SELECT 1 FROM matches WHERE ... auth.uid() is a member));
--
-- An UPDATE policy with a USING clause and no WITH CHECK applies that same
-- expression to the *new* row as well. The expression only asks "is the caller
-- a member of this match?" — it says nothing about which columns changed.
--
-- Postgres also grants UPDATE on every column by default. Put together, any
-- participant in a match could rewrite the OTHER person's message text:
--
--   await supabase.from('messages')
--     .update({ content: 'something they never said' })
--     .eq('id', theirMessageId)
--
-- ...and RLS would allow it, because the caller really is in that match. In a
-- dating app that is a serious problem: chat logs are exactly what someone
-- would screenshot as evidence of harassment, and this let either side forge
-- them. It is also invisible — the victim's own screen updates via realtime.
--
-- THE FIX
--
-- Row-level security controls which ROWS you may touch. Which COLUMNS you may
-- write is a separate, column-level privilege. Read receipts only ever need to
-- write `read`, so grant exactly that and nothing else. Now the policy above
-- can stay as-is: even though it permits the row, the privilege system refuses
-- any UPDATE that touches `content`, `sender_id`, `match_id`, or `created_at`.

REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (read) ON public.messages TO authenticated;

-- Messages are immutable once sent, so nobody needs DELETE either. (Deleting
-- the match still removes them via ON DELETE CASCADE, which runs as the
-- table owner and is unaffected by this.)
REVOKE DELETE ON public.messages FROM anon, authenticated;

-- Same reasoning for `swipes`: 001 deliberately has no UPDATE policy, but the
-- default column grants are still sitting there. Remove them so the intent is
-- enforced by privileges too, not just by the absence of a policy.
REVOKE UPDATE ON public.swipes FROM anon, authenticated;

-- `calls`: participants must be able to move a call through its lifecycle
-- (ringing -> accepted/declined/ended/missed), but they should not be able to
-- rewrite who called whom or which room it points at. Note room_name is what
-- app/api/livekit-token/route.ts reads to decide which LiveKit room to mint a
-- token for — if a caller could edit it after the fact, they could aim a
-- token at a room of their choosing.
REVOKE UPDATE ON public.calls FROM anon, authenticated;
GRANT UPDATE (status) ON public.calls TO authenticated;

-- Reports are a moderation record: file-once, never edit, never delete.
REVOKE UPDATE, DELETE ON public.reports FROM anon, authenticated;

-- Verification: prints the columns each role may still write.
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '--- remaining UPDATE column privileges ---';
  FOR r IN
    SELECT table_name, grantee, string_agg(column_name, ', ' ORDER BY column_name) AS cols
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND privilege_type = 'UPDATE'
      AND grantee IN ('anon', 'authenticated')
      AND table_name IN ('messages', 'swipes', 'calls', 'reports')
    GROUP BY table_name, grantee
    ORDER BY table_name, grantee
  LOOP
    RAISE NOTICE '  %.% -> %', r.grantee, r.table_name, r.cols;
  END LOOP;
END
$$;
