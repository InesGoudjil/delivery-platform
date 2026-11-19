-- ============================================================================
-- SHARE LINKS: soft delete
-- Date: 2026-11-19
--
-- Deleting a share link no longer removes its row: deleted_at is set (and the link is turned
-- off), so its URL stops working at once but its activity, counters and the comments that came
-- through it stay. Deleted links are hidden from the studio and never open the client room
-- (core/repositories/share-link.repository.ts filters them out).
--
-- Rows are no longer hard-deleted by members: the DELETE policy and grant are removed. Rows
-- still go when their delivery or workspace is deleted (ON DELETE CASCADE). Safe to re-run.
-- ============================================================================

ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.share_links.deleted_at IS
  'When the studio deleted the link (soft delete). A deleted link never opens and is hidden.';

-- The main link can't be deleted: make another link the main one first.
ALTER TABLE public.share_links DROP CONSTRAINT IF EXISTS share_links_primary_not_deleted;
ALTER TABLE public.share_links ADD CONSTRAINT share_links_primary_not_deleted
  CHECK (NOT (is_primary AND deleted_at IS NOT NULL));

-- A deleted link stays deleted: it can't be turned back on or changed back.
CREATE OR REPLACE FUNCTION public.guard_deleted_share_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'A deleted share link can''t be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_deleted_share_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_deleted_share_link ON public.share_links;
CREATE TRIGGER trg_guard_deleted_share_link
  BEFORE UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.guard_deleted_share_link();

CREATE INDEX IF NOT EXISTS share_links_delivery_live_idx
  ON public.share_links (delivery_id, created_at) WHERE deleted_at IS NULL;

-- No more hard deletes through a member's session.
DROP POLICY IF EXISTS "Admins can delete share links" ON public.share_links;
REVOKE DELETE ON TABLE public.share_links FROM authenticated;

-- A deleted (or turned-off) link can't become the main link.
CREATE OR REPLACE FUNCTION public.set_primary_share_link(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_delivery_id uuid;
  v_revoked_at timestamptz;
  v_deleted_at timestamptz;
BEGIN
  SELECT delivery_id, revoked_at, deleted_at INTO v_delivery_id, v_revoked_at, v_deleted_at
  FROM public.share_links WHERE id = p_link_id FOR UPDATE;
  IF v_delivery_id IS NULL OR v_deleted_at IS NOT NULL THEN
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
