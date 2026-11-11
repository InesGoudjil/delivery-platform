-- Migration: 20261110000000_performance_views_and_storage_triggers.sql
-- Description: Database-level optimization:
--   1. Missing performance indexes on deliveries, assets, and asset_versions
--   2. view_workspace_deliveries_summary: replaces N+1 delivery queries with a single relational aggregation
--   3. view_workspace_storage_breakdown: replaces N+1 storage asset loops with database aggregation
--   4. Trigger to maintain workspaces.storage_used_bytes in real time

-- ============================================================================
-- 1. CRITICAL PERFORMANCE INDEXES
-- ============================================================================

-- Index for delivery asset lookups (previously caused full table scans on assets)
CREATE INDEX IF NOT EXISTS idx_assets_delivery_id 
  ON public.assets(delivery_id) 
  WHERE delivery_id IS NOT NULL;

-- Composite index for fast active version resolution
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset_active 
  ON public.asset_versions(asset_id, is_active_version);

-- Index for listing deliveries by workspace ordered by date
CREATE INDEX IF NOT EXISTS idx_deliveries_workspace_created 
  ON public.deliveries(workspace_id, created_at DESC);

-- ============================================================================
-- 2. VIEW: WORKSPACE DELIVERIES SUMMARY
-- Aggregates delivery data, client name, asset counts, comments, and primary duration
-- ============================================================================

CREATE OR REPLACE VIEW public.view_workspace_deliveries_summary 
WITH (security_invoker = true)
AS
WITH delivery_assets_agg AS (
  SELECT 
    a.delivery_id,
    COUNT(a.id) AS assets_count,
    -- First/primary asset's active version info (ordered by sort_order)
    (ARRAY_AGG(av.version_number ORDER BY a.sort_order ASC, av.version_number DESC))[1] AS active_version_number,
    (ARRAY_AGG(av.duration_seconds ORDER BY a.sort_order ASC, av.version_number DESC))[1] AS active_duration_seconds
  FROM public.assets a
  LEFT JOIN public.asset_versions av 
    ON av.asset_id = a.id AND av.is_active_version = true
  WHERE a.delivery_id IS NOT NULL AND a.is_archived = false
  GROUP BY a.delivery_id
),
delivery_feedback_agg AS (
  SELECT 
    a.delivery_id,
    COUNT(f.id) AS comments_count
  FROM public.assets a
  JOIN public.asset_versions av 
    ON av.asset_id = a.id
  JOIN public.feedback f 
    ON f.asset_version_id = av.id
  WHERE a.delivery_id IS NOT NULL AND a.is_archived = false
  GROUP BY a.delivery_id
)
SELECT 
  d.id,
  d.workspace_id,
  d.client_id,
  d.title,
  d.description,
  d.share_token,
  d.status,
  d.is_download_allowed,
  d.is_comment_allowed,
  (d.passcode_hash IS NOT NULL) AS passcode_protected,
  COALESCE(c.name, 'Private Client') AS client_name,
  COALESCE(da.assets_count, 0)::int AS assets_count,
  COALESCE(df.comments_count, 0)::int AS comments_count,
  da.active_version_number::int AS active_version_number,
  da.active_duration_seconds::numeric AS active_duration_seconds,
  d.created_at,
  d.updated_at
FROM public.deliveries d
LEFT JOIN public.clients c ON c.id = d.client_id
LEFT JOIN delivery_assets_agg da ON da.delivery_id = d.id
LEFT JOIN delivery_feedback_agg df ON df.delivery_id = d.id;

-- ============================================================================
-- 3. VIEW: WORKSPACE STORAGE BREAKDOWN
-- Replaces fetching all assets into Node.js to sum file bytes
-- ============================================================================

CREATE OR REPLACE VIEW public.view_workspace_storage_breakdown
WITH (security_invoker = true)
AS
SELECT 
  a.workspace_id,
  COUNT(DISTINCT a.id)::int AS total_assets,
  COALESCE(SUM(CASE WHEN a.type = 'photo_gallery' THEN av.file_size_bytes ELSE 0 END), 0)::bigint AS total_still_bytes,
  COALESCE(SUM(CASE WHEN a.type != 'photo_gallery' THEN av.file_size_bytes ELSE 0 END), 0)::bigint AS total_video_bytes,
  COALESCE(SUM(CASE WHEN a.type != 'photo_gallery' AND av.hls_manifest_url IS NOT NULL THEN ROUND(av.file_size_bytes * 0.35) ELSE 0 END), 0)::bigint AS total_stream_bytes,
  (
    COALESCE(SUM(av.file_size_bytes), 0) + 
    COALESCE(SUM(CASE WHEN a.type != 'photo_gallery' AND av.hls_manifest_url IS NOT NULL THEN ROUND(av.file_size_bytes * 0.35) ELSE 0 END), 0)
  )::bigint AS total_used_bytes
FROM public.assets a
JOIN public.asset_versions av 
  ON av.asset_id = a.id AND av.is_active_version = true
WHERE a.is_archived = false
GROUP BY a.workspace_id;

-- ============================================================================
-- 4. STORAGE SYNCHRONIZATION FUNCTION & TRIGGER
-- Keeps workspaces.storage_used_bytes synchronized automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_workspace_storage_on_version_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id UUID;
  v_calculated_bytes BIGINT;
BEGIN
  -- Determine the affected workspace_id
  IF TG_OP = 'DELETE' THEN
    SELECT workspace_id INTO v_workspace_id FROM public.assets WHERE id = OLD.asset_id;
  ELSE
    SELECT workspace_id INTO v_workspace_id FROM public.assets WHERE id = NEW.asset_id;
  END IF;

  IF v_workspace_id IS NOT NULL THEN
    -- Calculate fresh storage usage directly from active asset versions
    SELECT COALESCE(
      SUM(av.file_size_bytes) + 
      SUM(CASE WHEN a.type != 'photo_gallery' AND av.hls_manifest_url IS NOT NULL THEN ROUND(av.file_size_bytes * 0.35) ELSE 0 END),
      0
    ) INTO v_calculated_bytes
    FROM public.assets a
    JOIN public.asset_versions av ON av.asset_id = a.id AND av.is_active_version = true
    WHERE a.workspace_id = v_workspace_id AND a.is_archived = false;

    -- Update the workspace record
    UPDATE public.workspaces
    SET storage_used_bytes = v_calculated_bytes,
        updated_at = NOW()
    WHERE id = v_workspace_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_sync_workspace_storage ON public.asset_versions;

CREATE TRIGGER trg_sync_workspace_storage
AFTER INSERT OR UPDATE OF file_size_bytes, is_active_version, hls_manifest_url OR DELETE
ON public.asset_versions
FOR EACH ROW
EXECUTE FUNCTION public.sync_workspace_storage_on_version_change();
