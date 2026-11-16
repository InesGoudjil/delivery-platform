-- ============================================================================
-- SHARE LINKS: several client links per delivery
-- ============================================================================
--
-- A delivery is the room (files, comments, approval). A share link is a way in, with its own
-- token and rules: label, recipient, passcode, expiry, comments, approvals, downloads and
-- notices. The client room finds the link by its token (core/security/client-room.ts), so
-- each link can be changed or revoked on its own. Plan: plans/share-links-manager-plan-2026-11-16.md.
--
-- Every delivery has exactly one primary link: the one emails, WhatsApp and the copy buttons
-- use. Its token and settings are mirrored on the delivery's own columns (share_token,
-- passcode_hash, expires_at, is_comment_allowed, is_download_allowed, notify_on_download),
-- in both directions, so code that still reads or writes those columns keeps working and the
-- app can be rolled back safely. The primary link can't be revoked or deleted: make another
-- link primary first.
--
-- Members read links through row-level security. The server writes them with the service
-- role after its own admin check, like the client room's other rows; the write policies below
-- hold the same rule for anyone using a member's session.
--
-- Also here: link activity (share_link_events) and its counters, and which link a guest's
-- comment came through. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_links (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  delivery_id        uuid NOT NULL REFERENCES public.deliveries (id) ON DELETE CASCADE,
  token              text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  label              text NOT NULL DEFAULT 'Client link',
  recipient_name     text,
  recipient_email    text,
  is_primary         boolean NOT NULL DEFAULT false,
  passcode_hash      text,
  -- An encrypted copy of a generated passcode, so the studio can see it again
  -- (lib/security/passcode-seal.ts). Never set for a passcode the studio typed.
  passcode_sealed    text,
  expires_at         timestamptz,
  revoked_at         timestamptz,
  can_comment        boolean NOT NULL DEFAULT true,
  can_approve        boolean NOT NULL DEFAULT true,
  can_download       boolean NOT NULL DEFAULT false,
  notify_on_open     boolean NOT NULL DEFAULT false,
  notify_on_download boolean NOT NULL DEFAULT false,
  notify_on_comment  boolean NOT NULL DEFAULT true,
  open_count         integer NOT NULL DEFAULT 0,
  download_count     integer NOT NULL DEFAULT 0,
  first_opened_at    timestamptz,
  last_opened_at     timestamptz,
  last_downloaded_at timestamptz,
  created_by         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT share_links_token_key UNIQUE (token),
  CONSTRAINT share_links_label_length CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  CONSTRAINT share_links_recipient_length CHECK (
    coalesce(char_length(recipient_name), 0) <= 120 AND coalesce(char_length(recipient_email), 0) <= 254
  ),
  CONSTRAINT share_links_primary_not_revoked CHECK (NOT (is_primary AND revoked_at IS NOT NULL))
);

COMMENT ON TABLE public.share_links IS
  'Client links into a delivery room, each with its own token and rules. One primary link per '
  'delivery, mirrored on the delivery''s own link columns. Read by members, written by the server.';

CREATE UNIQUE INDEX IF NOT EXISTS share_links_one_primary ON public.share_links (delivery_id) WHERE is_primary;
CREATE INDEX IF NOT EXISTS share_links_delivery_idx ON public.share_links (delivery_id, created_at);
CREATE INDEX IF NOT EXISTS share_links_workspace_idx ON public.share_links (workspace_id, created_at DESC);

-- A link stays with its delivery, and its delivery is in its workspace.
CREATE OR REPLACE FUNCTION public.guard_share_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.delivery_id IS DISTINCT FROM OLD.delivery_id
  ) THEN
    RAISE EXCEPTION 'A share link can''t move to another delivery' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.deliveries d WHERE d.id = NEW.delivery_id AND d.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'A share link''s delivery must be in the same workspace' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_share_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_share_link ON public.share_links;
CREATE TRIGGER trg_guard_share_link
  BEFORE INSERT OR UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.guard_share_link();

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.share_links FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.share_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.share_links TO service_role;

DROP POLICY IF EXISTS "Members can view share links" ON public.share_links;
CREATE POLICY "Members can view share links" ON public.share_links
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "Admins can add share links" ON public.share_links;
CREATE POLICY "Admins can add share links" ON public.share_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'));

DROP POLICY IF EXISTS "Admins can change share links" ON public.share_links;
CREATE POLICY "Admins can change share links" ON public.share_links
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'));

DROP POLICY IF EXISTS "Admins can delete share links" ON public.share_links;
CREATE POLICY "Admins can delete share links" ON public.share_links
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin') AND NOT is_primary);

-- ---------------------------------------------------------------------------
-- 2. Every existing delivery keeps its URL: its current token becomes its primary link.
--    (Before the mirror triggers exist, so the backfill doesn't rewrite the deliveries.)
-- ---------------------------------------------------------------------------
INSERT INTO public.share_links (
  workspace_id, delivery_id, token, label, is_primary, passcode_hash, expires_at,
  can_comment, can_download, notify_on_download, created_at, updated_at
)
SELECT
  d.workspace_id, d.id, d.share_token, 'Client link', true, d.passcode_hash, d.expires_at,
  coalesce(d.is_comment_allowed, true), coalesce(d.is_download_allowed, false),
  coalesce(d.notify_on_download, false), coalesce(d.created_at, now()), now()
FROM public.deliveries d
WHERE d.share_token IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.share_links l WHERE l.delivery_id = d.id AND l.is_primary)
ON CONFLICT (token) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. The primary link and the delivery's link columns mirror each other
-- ---------------------------------------------------------------------------
-- A new delivery gets its primary link; a change to its link columns reaches the primary link.
-- SECURITY DEFINER: an editor may create a delivery, but only admins may write links.
CREATE OR REPLACE FUNCTION public.sync_primary_share_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A change the other mirror made: don't send it back.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.share_links (
      workspace_id, delivery_id, token, label, is_primary, passcode_hash, expires_at,
      can_comment, can_download, notify_on_download, created_at
    ) VALUES (
      NEW.workspace_id, NEW.id, NEW.share_token, 'Client link', true, NEW.passcode_hash, NEW.expires_at,
      coalesce(NEW.is_comment_allowed, true), coalesce(NEW.is_download_allowed, false),
      coalesce(NEW.notify_on_download, false), coalesce(NEW.created_at, now())
    )
    ON CONFLICT (token) DO NOTHING;
    RETURN NULL;
  END IF;

  UPDATE public.share_links SET
    token = NEW.share_token,
    passcode_hash = NEW.passcode_hash,
    -- A passcode changed through the old columns has no sealed copy to show.
    passcode_sealed = CASE WHEN NEW.passcode_hash IS DISTINCT FROM OLD.passcode_hash THEN NULL ELSE passcode_sealed END,
    expires_at = NEW.expires_at,
    can_comment = coalesce(NEW.is_comment_allowed, true),
    can_download = coalesce(NEW.is_download_allowed, false),
    notify_on_download = coalesce(NEW.notify_on_download, false),
    updated_at = now()
  WHERE delivery_id = NEW.id AND is_primary;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_primary_share_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_primary_share_link_insert ON public.deliveries;
CREATE TRIGGER trg_sync_primary_share_link_insert
  AFTER INSERT ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.sync_primary_share_link();

DROP TRIGGER IF EXISTS trg_sync_primary_share_link_update ON public.deliveries;
CREATE TRIGGER trg_sync_primary_share_link_update
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  WHEN (
       OLD.share_token IS DISTINCT FROM NEW.share_token
    OR OLD.passcode_hash IS DISTINCT FROM NEW.passcode_hash
    OR OLD.expires_at IS DISTINCT FROM NEW.expires_at
    OR OLD.is_comment_allowed IS DISTINCT FROM NEW.is_comment_allowed
    OR OLD.is_download_allowed IS DISTINCT FROM NEW.is_download_allowed
    OR OLD.notify_on_download IS DISTINCT FROM NEW.notify_on_download
  )
  EXECUTE FUNCTION public.sync_primary_share_link();

-- The primary link's token and settings reach the delivery's columns (and a newly primary
-- link replaces the old one's there).
CREATE OR REPLACE FUNCTION public.sync_delivery_from_primary_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;
  UPDATE public.deliveries SET
    share_token = NEW.token,
    passcode_hash = NEW.passcode_hash,
    expires_at = NEW.expires_at,
    is_comment_allowed = NEW.can_comment,
    is_download_allowed = NEW.can_download,
    notify_on_download = NEW.notify_on_download
  WHERE id = NEW.delivery_id;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_delivery_from_primary_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_delivery_from_primary_link_insert ON public.share_links;
CREATE TRIGGER trg_sync_delivery_from_primary_link_insert
  AFTER INSERT ON public.share_links
  FOR EACH ROW WHEN (NEW.is_primary)
  EXECUTE FUNCTION public.sync_delivery_from_primary_link();

DROP TRIGGER IF EXISTS trg_sync_delivery_from_primary_link_update ON public.share_links;
CREATE TRIGGER trg_sync_delivery_from_primary_link_update
  AFTER UPDATE ON public.share_links
  FOR EACH ROW
  WHEN (
    NEW.is_primary AND (
         OLD.is_primary IS DISTINCT FROM NEW.is_primary
      OR OLD.token IS DISTINCT FROM NEW.token
      OR OLD.passcode_hash IS DISTINCT FROM NEW.passcode_hash
      OR OLD.expires_at IS DISTINCT FROM NEW.expires_at
      OR OLD.can_comment IS DISTINCT FROM NEW.can_comment
      OR OLD.can_download IS DISTINCT FROM NEW.can_download
      OR OLD.notify_on_download IS DISTINCT FROM NEW.notify_on_download
    )
  )
  EXECUTE FUNCTION public.sync_delivery_from_primary_link();

-- Makes a link the delivery's primary link, in one step (the old primary becomes a normal
-- link). Service role only: the server checks the caller is an admin first.
CREATE OR REPLACE FUNCTION public.set_primary_share_link(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_delivery_id uuid;
  v_revoked_at timestamptz;
BEGIN
  SELECT delivery_id, revoked_at INTO v_delivery_id, v_revoked_at
  FROM public.share_links WHERE id = p_link_id FOR UPDATE;
  IF v_delivery_id IS NULL THEN
    RAISE EXCEPTION 'Share link not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'A revoked link can''t be the main link' USING ERRCODE = '23514';
  END IF;
  UPDATE public.share_links SET is_primary = false, updated_at = now()
  WHERE delivery_id = v_delivery_id AND is_primary AND id <> p_link_id;
  UPDATE public.share_links SET is_primary = true, updated_at = now()
  WHERE id = p_link_id AND NOT is_primary;
END;
$$;
REVOKE ALL ON FUNCTION public.set_primary_share_link(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_primary_share_link(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Link activity: opens, unlocks, downloads, comments, approvals
-- ---------------------------------------------------------------------------
-- No raw IP addresses: `visitor` is a keyed hash of the visitor's IP and browser, cut short,
-- only good for telling repeat visits apart.
CREATE TABLE IF NOT EXISTS public.share_link_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id      uuid NOT NULL REFERENCES public.share_links (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  delivery_id  uuid NOT NULL REFERENCES public.deliveries (id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('open', 'unlock', 'unlock_failed', 'download', 'comment', 'approve')),
  asset_id     uuid,
  visitor      text CHECK (visitor IS NULL OR char_length(visitor) <= 64),
  country      text CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.share_link_events IS
  'What happened through each share link (opens, unlocks, downloads, comments, approvals). '
  'Written by the server only; members can read their workspace''s.';

CREATE INDEX IF NOT EXISTS share_link_events_link_recent ON public.share_link_events (link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS share_link_events_workspace_recent ON public.share_link_events (workspace_id, created_at DESC);

ALTER TABLE public.share_link_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.share_link_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.share_link_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.share_link_events TO service_role;

DROP POLICY IF EXISTS "Members can view share link activity" ON public.share_link_events;
CREATE POLICY "Members can view share link activity" ON public.share_link_events
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, 'viewer'));

-- Saves one event and moves the link's counters. A visitor's repeat opens within an hour
-- count once. Returns {"recorded": bool, "first_open": bool}; first_open is true for the
-- link's very first open, even when two arrive at once. Service role only.
CREATE OR REPLACE FUNCTION public.record_share_link_event(
  p_link_id uuid,
  p_kind text,
  p_asset_id uuid DEFAULT NULL,
  p_visitor text DEFAULT NULL,
  p_country text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_delivery_id uuid;
  v_first_open boolean := false;
BEGIN
  SELECT workspace_id, delivery_id INTO v_workspace_id, v_delivery_id
  FROM public.share_links WHERE id = p_link_id;
  IF v_delivery_id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'first_open', false);
  END IF;

  IF p_kind = 'open' AND p_visitor IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.share_link_events
    WHERE link_id = p_link_id AND kind = 'open' AND visitor = p_visitor
      AND created_at > now() - interval '1 hour'
  ) THEN
    RETURN jsonb_build_object('recorded', false, 'first_open', false);
  END IF;

  INSERT INTO public.share_link_events (link_id, workspace_id, delivery_id, kind, asset_id, visitor, country)
  VALUES (p_link_id, v_workspace_id, v_delivery_id, p_kind, p_asset_id, p_visitor, p_country);

  IF p_kind = 'open' THEN
    UPDATE public.share_links SET
      open_count = open_count + 1,
      last_opened_at = now(),
      first_opened_at = coalesce(first_opened_at, now())
    WHERE id = p_link_id
    RETURNING first_opened_at = now() INTO v_first_open;
  ELSIF p_kind = 'download' THEN
    UPDATE public.share_links SET
      download_count = download_count + 1,
      last_downloaded_at = now()
    WHERE id = p_link_id;
  END IF;

  RETURN jsonb_build_object('recorded', true, 'first_open', coalesce(v_first_open, false));
END;
$$;
REVOKE ALL ON FUNCTION public.record_share_link_event(uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_share_link_event(uuid, text, uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Which link a guest's comment or reply came through (null: a studio member, or before
--    links). Approvals are 'approve' events above.
-- ---------------------------------------------------------------------------
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS share_link_id uuid
  REFERENCES public.share_links (id) ON DELETE SET NULL;
ALTER TABLE public.feedback_replies ADD COLUMN IF NOT EXISTS share_link_id uuid
  REFERENCES public.share_links (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.feedback.share_link_id IS 'The share link a guest comment came through.';
COMMENT ON COLUMN public.feedback_replies.share_link_id IS 'The share link a guest reply came through.';
