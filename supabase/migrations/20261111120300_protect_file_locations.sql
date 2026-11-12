-- Where a file is stored is written by the server only.
--
-- asset_versions.raw_file_url, hls_manifest_url and thumbnail_url say where a file version
-- is stored. Server code signs, copies (into Cloudflare Stream) and deletes whatever they
-- point at with its own storage credentials, so a signed-in user who can write them can read
-- or delete another studio's files. file_size_bytes feeds the storage counter and the quota;
-- transcoding_status and duration_seconds describe the stored file; silo_archive_key and
-- silo_storage_class point into the Glacier archive. Until now any editor could write all of
-- them through the API.
--
-- After this migration, signed-in API users (role authenticated):
--   - read every column (row-level security still decides which rows);
--   - can change only is_active_version and label (pick the active version, rename one);
--   - can't create versions: the server (service role) creates a version when an upload is
--     requested, and fills in the media columns after checking the uploaded object;
--   - delete versions as before (admins, by row-level security).
--
-- Also: at most one active version per file. The app switches versions by deactivating the
-- current one first. Files that have several active versions today (an upload that never
-- finished used to become active right away) keep the newest one that isn't a pending upload.
--
-- No functions are added. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Column privileges
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.asset_versions FROM authenticated;
GRANT UPDATE (is_active_version, label) ON public.asset_versions TO authenticated;

-- Versions are created by the server only; the policy would be dead weight.
DROP POLICY IF EXISTS "Editors can add asset versions" ON public.asset_versions;

COMMENT ON COLUMN public.asset_versions.raw_file_url IS
  'Where the file is stored: an R2 key (or its public URL) under workspaces/<workspace_id>/, a Cloudflare Stream manifest URL, or silo://<key>. Written by the server only.';
COMMENT ON COLUMN public.asset_versions.hls_manifest_url IS
  'Cloudflare Stream manifest of the streaming copy. Written by the server only.';
COMMENT ON COLUMN public.asset_versions.thumbnail_url IS
  'Poster image: an R2 key (or its public URL) in the same workspace, or a Stream thumbnail of the file''s own video. Written by the server only.';
COMMENT ON COLUMN public.asset_versions.file_size_bytes IS
  'Size of the stored object as reported by storage (counted in workspaces.storage_used_bytes while active). Written by the server only.';

-- ---------------------------------------------------------------------------
-- 2. At most one active version per file
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY asset_id
      ORDER BY (transcoding_status IS DISTINCT FROM 'pending') DESC,
               version_number DESC,
               created_at DESC NULLS LAST,
               id
    ) AS position
  FROM public.asset_versions
  WHERE is_active_version
)
UPDATE public.asset_versions v
SET is_active_version = false
FROM ranked r
WHERE v.id = r.id AND r.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_versions_one_active
  ON public.asset_versions (asset_id)
  WHERE is_active_version;

COMMENT ON INDEX public.uq_asset_versions_one_active IS
  'A file has at most one active version. Switch versions by deactivating the current one first.';
