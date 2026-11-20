-- ============================================================================
-- DELIVERIES SUMMARY: open client notes and last activity
-- Date: 2026-11-20
--
-- The deliveries list filters on "Needs reply" and sorts by latest activity. Adds what it
-- needs to view_workspace_deliveries_summary:
--
--   approved_at, approved_by_name  when the room was approved, and by whom
--   open_notes_count    unresolved notes written by clients. Guests write with no
--                       author_user_id (app/actions/feedback.ts), so the studio's own notes
--                       don't count.
--   last_note_at        the newest note or reply, from anyone
--   last_opened_at      the last time a client opened any of the room's links, and the last
--   last_downloaded_at  download through one. Only guests are counted
--                       (app/actions/deliveries/link-activity.ts). Deleted links still count:
--                       their visits happened.
--   last_activity_at    the latest of all of the above, new files and versions, and the
--                       room's own updated_at. updated_at alone isn't activity: nothing moves
--                       it when a client comments or a file lands.
--
-- The existing columns keep their names, types and order (CREATE OR REPLACE VIEW can only
-- append), so current readers are unaffected. The view still runs as the caller
-- (security_invoker), so each table's row-level security still applies.
--
-- Needs 20261116120000_share_links.sql. Safe to re-run.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.share_links') IS NULL THEN
    RAISE EXCEPTION 'public.share_links is missing: apply 20261116120000_share_links.sql first';
  END IF;
END
$$;

CREATE OR REPLACE VIEW public.view_workspace_deliveries_summary
WITH (security_invoker = true)
AS
WITH delivery_assets_agg AS (
  SELECT
    a.delivery_id,
    COUNT(a.id) AS assets_count,
    -- First/primary asset's active version info (ordered by sort_order)
    (ARRAY_AGG(av.version_number ORDER BY a.sort_order ASC, av.version_number DESC))[1] AS active_version_number,
    (ARRAY_AGG(av.duration_seconds ORDER BY a.sort_order ASC, av.version_number DESC))[1] AS active_duration_seconds,
    -- A new version becomes the active one, so this is the newest upload.
    GREATEST(MAX(a.created_at), MAX(av.created_at)) AS last_upload_at
  FROM public.assets a
  LEFT JOIN public.asset_versions av
    ON av.asset_id = a.id AND av.is_active_version = true
  WHERE a.delivery_id IS NOT NULL AND a.is_archived = false
  GROUP BY a.delivery_id
),
delivery_feedback_agg AS (
  SELECT
    a.delivery_id,
    COUNT(f.id) AS comments_count,
    COUNT(f.id) FILTER (WHERE f.author_user_id IS NULL AND f.is_resolved IS NOT TRUE) AS open_notes_count,
    MAX(f.created_at) AS last_feedback_at
  FROM public.assets a
  JOIN public.asset_versions av
    ON av.asset_id = a.id
  JOIN public.feedback f
    ON f.asset_version_id = av.id
  WHERE a.delivery_id IS NOT NULL AND a.is_archived = false
  GROUP BY a.delivery_id
),
delivery_replies_agg AS (
  SELECT
    a.delivery_id,
    MAX(r.created_at) AS last_reply_at
  FROM public.assets a
  JOIN public.asset_versions av
    ON av.asset_id = a.id
  JOIN public.feedback f
    ON f.asset_version_id = av.id
  JOIN public.feedback_replies r
    ON r.feedback_id = f.id
  WHERE a.delivery_id IS NOT NULL AND a.is_archived = false
  GROUP BY a.delivery_id
),
delivery_links_agg AS (
  SELECT
    sl.delivery_id,
    MAX(sl.last_opened_at) AS last_opened_at,
    MAX(sl.last_downloaded_at) AS last_downloaded_at
  FROM public.share_links sl
  GROUP BY sl.delivery_id
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
  d.updated_at,
  -- Added 2026-11-20
  d.approved_at,
  d.approved_by_name,
  COALESCE(df.open_notes_count, 0)::int AS open_notes_count,
  GREATEST(df.last_feedback_at, dr.last_reply_at) AS last_note_at,
  dl.last_opened_at,
  dl.last_downloaded_at,
  GREATEST(
    d.updated_at,
    d.approved_at,
    da.last_upload_at,
    df.last_feedback_at,
    dr.last_reply_at,
    dl.last_opened_at,
    dl.last_downloaded_at
  ) AS last_activity_at
FROM public.deliveries d
LEFT JOIN public.clients c ON c.id = d.client_id
LEFT JOIN delivery_assets_agg da ON da.delivery_id = d.id
LEFT JOIN delivery_feedback_agg df ON df.delivery_id = d.id
LEFT JOIN delivery_replies_agg dr ON dr.delivery_id = d.id
LEFT JOIN delivery_links_agg dl ON dl.delivery_id = d.id;

COMMENT ON VIEW public.view_workspace_deliveries_summary IS
  'One row per delivery for the deliveries list: counts, open client notes and last activity. '
  'Runs as the caller, so row-level security applies.';
