-- "Not in a delivery" no longer means "on the public portfolio".
--
-- The public portfolio used to show every file of a workspace that had no delivery and
-- wasn't in Trash. Files lose their delivery when the delivery is deleted, so restoring
-- one of those files from Trash (or a delivery deletion that failed half-way) put a
-- client's private file on the studio's public page. A file is now a standalone portfolio
-- piece only when it's marked as one, which the server does for uploads made through the
-- portfolio's standalone flow (stored under .../portfolio/standalone/...).
--
-- Showcase projects keep listing their own files through project_assets. Safe to re-run.

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS is_portfolio boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.assets.is_portfolio IS
  'Shown on the public portfolio as a standalone piece. Only for files outside any delivery; delivery files, project media, covers and branding are never standalone pieces.';

-- Existing standalone pieces: files outside any delivery whose stored key sits under the
-- portfolio's standalone folder. Former delivery files (keys under .../deliveries/...) stay off.
UPDATE public.assets a
SET is_portfolio = true
WHERE a.is_portfolio = false
  AND a.delivery_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.asset_versions v
    WHERE v.asset_id = a.id
      AND (v.raw_file_url LIKE '%/portfolio/standalone/%' OR v.thumbnail_url LIKE '%/portfolio/standalone/%')
  );

-- A file in a delivery is never a standalone portfolio piece.
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_portfolio_outside_deliveries;
ALTER TABLE public.assets ADD CONSTRAINT assets_portfolio_outside_deliveries
  CHECK (NOT (is_portfolio AND delivery_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_assets_workspace_portfolio
  ON public.assets (workspace_id, sort_order)
  WHERE is_portfolio AND NOT is_archived;
