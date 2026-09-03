-- ============================================================================
-- 006 — Match summaries (fixes the N+1 query on the Matches page)
-- Run AFTER 005. Safe to re-run.
-- ============================================================================
--
-- The Matches page previously ran, for every single match:
--   1 query for the last message  +  1 query for the unread count
-- ...on top of the query that fetched the matches. A user with 40 matches was
-- making 81 round trips to Supabase on every page load. That is the classic
-- "N+1 query" problem and it's the single most common cause of a page that
-- feels fine with test data and crawls the moment it has real users.
--
-- This function does the whole thing in one query using LATERAL joins, which
-- let each match pull its own "top 1 message" without a separate round trip.
--
-- SECURITY INVOKER (the default, stated explicitly for clarity) means Row
-- Level Security still applies exactly as normal: auth.uid() is the calling
-- user, and the policies on matches/messages are enforced. This is NOT a
-- privilege escalation — it's the same data, fetched sensibly.

CREATE OR REPLACE FUNCTION public.get_match_summaries()
RETURNS TABLE (
  match_id UUID,
  matched_at TIMESTAMPTZ,
  other_user_id UUID,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.matched_at,
    CASE WHEN m.user1_id = auth.uid() THEN m.user2_id ELSE m.user1_id END,
    lm.id,
    lm.content,
    lm.sender_id,
    lm.created_at,
    COALESCE(uc.cnt, 0)
  FROM public.matches m
  LEFT JOIN LATERAL (
    SELECT msg.id, msg.content, msg.sender_id, msg.created_at
    FROM public.messages msg
    WHERE msg.match_id = m.id
    ORDER BY msg.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.messages msg
    WHERE msg.match_id = m.id
      AND msg.read = FALSE
      AND msg.sender_id <> auth.uid()
  ) uc ON TRUE
  WHERE (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    AND m.is_active
    -- Hide matches with anyone in a blocked pair, without revealing who
    -- blocked whom (is_blocked_pair returns only a boolean).
    AND NOT public.is_blocked_pair(m.user1_id, m.user2_id)
  ORDER BY COALESCE(lm.created_at, m.matched_at) DESC;
$$;

-- Supports the ORDER BY inside the lateral join.
CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON public.messages(match_id, created_at DESC);

-- Supports the unread count.
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON public.messages(match_id, sender_id) WHERE read = FALSE;

GRANT EXECUTE ON FUNCTION public.get_match_summaries() TO authenticated;
