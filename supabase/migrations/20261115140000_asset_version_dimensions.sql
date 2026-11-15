-- Pixel size of each file version, so grids can show files at their real shape.
--
-- The uploader records what the browser reads from the file. For videos the browser can't
-- read (ProRes, MXF and similar), Cloudflare Stream's source size fills the gap when the video
-- is ready. Null means unknown. Only the server writes these: signed-in users have no INSERT
-- or UPDATE on these columns (see 20261111120300_protect_file_locations).
ALTER TABLE public.asset_versions
  ADD COLUMN width integer,
  ADD COLUMN height integer,
  ADD CONSTRAINT asset_versions_dimensions_check CHECK (
    (width IS NULL AND height IS NULL)
    OR (width BETWEEN 1 AND 100000 AND height BETWEEN 1 AND 100000)
  );

COMMENT ON COLUMN public.asset_versions.width IS 'Pixel width of the file as displayed; null when unknown';
COMMENT ON COLUMN public.asset_versions.height IS 'Pixel height of the file as displayed; null when unknown';
