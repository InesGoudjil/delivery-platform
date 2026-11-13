-- Client comments, batched into one studio email per delivery (library email 26).
--
-- A batch opens with the first client comment on a delivery and closes window_seconds later
-- (send_at). Comments that arrive while the batch is open, or after it closed but before the
-- scheduled notifications route claimed it, are counted into it. The route claims the due batches
-- once and deletes them, so a batch is emailed once. Service role only.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.comment_email_batches (
  delivery_id uuid PRIMARY KEY REFERENCES public.deliveries(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  send_at timestamptz NOT NULL,
  comment_count integer NOT NULL DEFAULT 0,
  latest_author text,
  latest_excerpt text,
  latest_version_number integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comment_email_batches IS
  'Client comments not yet emailed to the studio, per delivery, in a batch window. Service role only.';

ALTER TABLE public.comment_email_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comment_email_batches FROM anon, authenticated;

-- Counts a client comment into the delivery's batch, opening one when there isn't one.
-- opened = true for the comment that opened the batch.
CREATE OR REPLACE FUNCTION public.record_comment_email(
  p_delivery_id uuid,
  p_workspace_id uuid,
  p_author text,
  p_excerpt text,
  p_version_number integer,
  p_window_seconds integer DEFAULT 600
)
RETURNS TABLE (opened boolean, send_at timestamptz, comment_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  batch public.comment_email_batches;
BEGIN
  INSERT INTO public.comment_email_batches AS b
    (delivery_id, workspace_id, window_started_at, send_at, comment_count, latest_author, latest_excerpt, latest_version_number, updated_at)
  VALUES
    (p_delivery_id, p_workspace_id, now(), now() + make_interval(secs => p_window_seconds), 1, p_author, p_excerpt, p_version_number, now())
  ON CONFLICT (delivery_id) DO UPDATE
    SET comment_count = b.comment_count + 1,
        latest_author = EXCLUDED.latest_author,
        latest_excerpt = EXCLUDED.latest_excerpt,
        latest_version_number = EXCLUDED.latest_version_number,
        updated_at = now()
  RETURNING * INTO batch;

  RETURN QUERY SELECT (batch.comment_count = 1), batch.send_at, batch.comment_count;
END;
$$;

-- Claims the batches whose window has closed: deletes them and returns what to email.
-- Rows locked by another run are skipped, so two runs never send the same batch.
CREATE OR REPLACE FUNCTION public.claim_due_comment_email_batches(
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  delivery_id uuid,
  workspace_id uuid,
  comment_count integer,
  author text,
  excerpt text,
  version_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT b.delivery_id, b.workspace_id, b.comment_count, b.latest_author, b.latest_excerpt, b.latest_version_number
    FROM public.comment_email_batches b
    WHERE b.send_at <= now()
    ORDER BY b.send_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    DELETE FROM public.comment_email_batches b
    USING due
    WHERE b.delivery_id = due.delivery_id
    RETURNING b.delivery_id
  )
  SELECT due.delivery_id, due.workspace_id, due.comment_count, due.latest_author, due.latest_excerpt, due.latest_version_number
  FROM due
  JOIN claimed ON claimed.delivery_id = due.delivery_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_comment_email(uuid, uuid, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_comment_email_batches(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_comment_email(uuid, uuid, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_comment_email_batches(integer) TO service_role;
