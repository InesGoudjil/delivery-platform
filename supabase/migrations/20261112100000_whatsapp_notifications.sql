-- WhatsApp notifications through Zoho CPaaS (docs/notifications.md).
--
-- 1. Each workspace has one WhatsApp number for studio alerts (approvals, comments,
--    downloads). It must be verified with a one-time code sent over WhatsApp before anything
--    is sent to it, and only the server sets it: API users can change the alert toggles, not
--    the number or its verification. Numbers saved before this migration stay unverified.
-- 2. Clients get the review link on WhatsApp only after the studio confirms the client
--    agreed to it; the confirmation is recorded on the client.
-- 3. Comment alerts are grouped per delivery (whatsapp_comment_batches): the first client
--    comment of a review session alerts the studio, later ones are counted and sent as one
--    message after a quiet period. Service role only.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Studio WhatsApp number and per-event WhatsApp toggles
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_pending_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_code_hash text,
  ADD COLUMN IF NOT EXISTS whatsapp_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_code_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_notify_approvals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_notify_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_notify_downloads boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.workspace_settings.whatsapp_verified_at IS
  'When whatsapp_number was verified with a one-time code. Studio alerts go only to a verified number.';
COMMENT ON COLUMN public.workspace_settings.whatsapp_code_hash IS
  'Keyed hash (HMAC with a server secret) of the pending verification code. Server-written.';

CREATE OR REPLACE FUNCTION public.guard_workspace_settings_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.whatsapp_number := NULL;
      NEW.whatsapp_verified_at := NULL;
      NEW.whatsapp_pending_number := NULL;
      NEW.whatsapp_code_hash := NULL;
      NEW.whatsapp_code_expires_at := NULL;
      NEW.whatsapp_code_attempts := 0;
    ELSIF NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number
       OR NEW.whatsapp_verified_at IS DISTINCT FROM OLD.whatsapp_verified_at
       OR NEW.whatsapp_pending_number IS DISTINCT FROM OLD.whatsapp_pending_number
       OR NEW.whatsapp_code_hash IS DISTINCT FROM OLD.whatsapp_code_hash
       OR NEW.whatsapp_code_expires_at IS DISTINCT FROM OLD.whatsapp_code_expires_at
       OR NEW.whatsapp_code_attempts IS DISTINCT FROM OLD.whatsapp_code_attempts THEN
      RAISE EXCEPTION 'The WhatsApp number can only be changed through verification' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_workspace_settings_whatsapp() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_workspace_settings_whatsapp ON public.workspace_settings;
CREATE TRIGGER trg_guard_workspace_settings_whatsapp
  BEFORE INSERT OR UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_settings_whatsapp();

-- ---------------------------------------------------------------------------
-- 2. Client consent to WhatsApp messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.clients.whatsapp_consent_at IS
  'When a studio member confirmed this client agreed to get WhatsApp messages from CineSpace about their deliveries.';

-- ---------------------------------------------------------------------------
-- 3. Grouped comment alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_comment_batches (
  delivery_id uuid PRIMARY KEY REFERENCES public.deliveries(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pending_count integer NOT NULL DEFAULT 0,
  latest_author text,
  latest_excerpt text,
  last_comment_at timestamptz,
  last_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_comment_batches IS
  'Client comments not yet announced to the studio on WhatsApp, per delivery. Service role only.';

ALTER TABLE public.whatsapp_comment_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_comment_batches FROM anon, authenticated;

-- Counts a client comment. Returns send_now = true (and resets the count) when the studio
-- hasn't had a WhatsApp comment alert for this delivery in the last p_gap_seconds.
CREATE OR REPLACE FUNCTION public.record_whatsapp_comment(
  p_delivery_id uuid,
  p_workspace_id uuid,
  p_author text,
  p_excerpt text,
  p_gap_seconds integer DEFAULT 900
)
RETURNS TABLE (send_now boolean, comment_count integer, author text, excerpt text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  batch public.whatsapp_comment_batches;
BEGIN
  INSERT INTO public.whatsapp_comment_batches AS w
    (delivery_id, workspace_id, pending_count, latest_author, latest_excerpt, last_comment_at, updated_at)
  VALUES (p_delivery_id, p_workspace_id, 1, p_author, p_excerpt, now(), now())
  ON CONFLICT (delivery_id) DO UPDATE
    SET pending_count = w.pending_count + 1,
        latest_author = EXCLUDED.latest_author,
        latest_excerpt = EXCLUDED.latest_excerpt,
        last_comment_at = now(),
        updated_at = now()
  RETURNING * INTO batch;

  IF batch.last_sent_at IS NULL OR batch.last_sent_at < now() - make_interval(secs => p_gap_seconds) THEN
    UPDATE public.whatsapp_comment_batches
    SET pending_count = 0, last_sent_at = now(), updated_at = now()
    WHERE delivery_id = p_delivery_id;
    RETURN QUERY SELECT true, batch.pending_count, batch.latest_author, batch.latest_excerpt;
  ELSE
    RETURN QUERY SELECT false, batch.pending_count, batch.latest_author, batch.latest_excerpt;
  END IF;
END;
$$;

-- Claims the batches whose review session went quiet (no comment for p_quiet_seconds) and
-- whose last alert is older than p_gap_seconds; resets them and returns what to announce.
CREATE OR REPLACE FUNCTION public.claim_due_whatsapp_comment_batches(
  p_quiet_seconds integer DEFAULT 600,
  p_gap_seconds integer DEFAULT 900,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (delivery_id uuid, workspace_id uuid, comment_count integer, author text, excerpt text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT b.delivery_id, b.workspace_id, b.pending_count, b.latest_author, b.latest_excerpt
    FROM public.whatsapp_comment_batches b
    WHERE b.pending_count > 0
      AND b.last_comment_at < now() - make_interval(secs => p_quiet_seconds)
      AND (b.last_sent_at IS NULL OR b.last_sent_at < now() - make_interval(secs => p_gap_seconds))
    ORDER BY b.last_comment_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.whatsapp_comment_batches b
    SET pending_count = 0, last_sent_at = now(), updated_at = now()
    FROM due
    WHERE b.delivery_id = due.delivery_id
    RETURNING b.delivery_id
  )
  SELECT due.delivery_id, due.workspace_id, due.pending_count, due.latest_author, due.latest_excerpt
  FROM due JOIN claimed ON claimed.delivery_id = due.delivery_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_whatsapp_comment(uuid, uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_due_whatsapp_comment_batches(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_whatsapp_comment(uuid, uuid, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_whatsapp_comment_batches(integer, integer, integer) TO service_role;
