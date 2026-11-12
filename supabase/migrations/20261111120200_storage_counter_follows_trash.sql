-- workspaces.storage_used_bytes is maintained by the database only.
--
-- 20261110000000 recalculates it when a file version changes, but not when a file moves
-- to Trash, comes back from Trash, or is deleted (the versions go with the asset through
-- ON DELETE CASCADE, after the asset row is gone, so that trigger can't find the
-- workspace). App code made up for it by adjusting the counter itself, on top of the
-- trigger, through the user's own connection. API users can no longer write the counter
-- (20261111120000), so these triggers keep it right on their own.
--
-- Counted: the active version of every file not in Trash, plus 35% for the streaming
-- copy of videos (same formula as 20261110000000 and view_workspace_storage_breakdown).
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.recalculate_workspace_storage(ws_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF ws_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.workspaces w
  SET storage_used_bytes = COALESCE((
        SELECT SUM(av.file_size_bytes)
             + SUM(CASE WHEN a.type <> 'photo_gallery' AND av.hls_manifest_url IS NOT NULL
                        THEN ROUND(av.file_size_bytes * 0.35) ELSE 0 END)
        FROM public.assets a
        JOIN public.asset_versions av ON av.asset_id = a.id AND av.is_active_version = true
        WHERE a.workspace_id = ws_id AND a.is_archived = false
      ), 0),
      updated_at = now()
  WHERE w.id = ws_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_workspace_storage(uuid) IS
  'Recomputes workspaces.storage_used_bytes from active, non-trashed file versions. Called by triggers; the service role may call it to repair a counter.';

REVOKE ALL ON FUNCTION public.recalculate_workspace_storage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_workspace_storage(uuid) TO service_role;

-- File versions: same events as before, now through the shared function.
CREATE OR REPLACE FUNCTION public.sync_workspace_storage_on_version_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.asset_id ELSE NEW.asset_id END;
BEGIN
  PERFORM public.recalculate_workspace_storage((SELECT workspace_id FROM public.assets WHERE id = v_asset_id));
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_workspace_storage_on_version_change() FROM PUBLIC, anon, authenticated;

-- Files: moving to or from Trash, or deleting the file, changes what's counted.
CREATE OR REPLACE FUNCTION public.sync_workspace_storage_on_asset_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_workspace_storage(OLD.workspace_id);
  ELSE
    PERFORM public.recalculate_workspace_storage(NEW.workspace_id);
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      PERFORM public.recalculate_workspace_storage(OLD.workspace_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_workspace_storage_on_asset_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_workspace_storage_on_asset ON public.assets;
CREATE TRIGGER trg_sync_workspace_storage_on_asset
  AFTER UPDATE OF is_archived, workspace_id, type OR DELETE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_storage_on_asset_change();

-- Repair counters that drifted from double counting in app code.
DO $$
DECLARE
  ws record;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    PERFORM public.recalculate_workspace_storage(ws.id);
  END LOOP;
END $$;
