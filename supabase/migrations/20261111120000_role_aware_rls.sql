-- Enforce workspace roles in the database, not only in app code.
--
--   viewer  reads everything in the workspace and comments
--   editor  + creates and edits deliveries, files, clients, portfolio and showcase projects
--   admin   + changes client-room access (passcode, share link, downloads, comments, expiry),
--             deletes, manages members (except owners) and invitations, edits workspace settings
--   owner   + manages owners. The owner in workspaces.owner_id can't be removed or demoted.
--
-- Also:
--   - files can only be placed in a delivery of the same workspace (another studio's client
--     room could be filled with files before);
--   - rows can't be moved to another workspace, asset, version or comment thread;
--   - workspaces.owner_id and storage_used_bytes can't be changed through the API;
--   - users can read their own sessions, including revoked ones (sign-out enforcement reads
--     them), and only the service role writes sessions.
--
-- The service role (server code after its own checks) and SECURITY DEFINER functions are not
-- affected by any of this. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 0. Helper: does the caller have at least `min_role` in the workspace?
--    The owner in workspaces.owner_id counts as owner even without a membership row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_workspace_role(ws_id uuid, min_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = ws_id AND w.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members m
      WHERE m.workspace_id = ws_id
        AND m.user_id = auth.uid()
        AND array_position(ARRAY['viewer', 'editor', 'admin', 'owner'], m.role)
            >= array_position(ARRAY['viewer', 'editor', 'admin', 'owner'], min_role)
    )
  );
$$;

COMMENT ON FUNCTION public.has_workspace_role(uuid, text) IS
  'True when the signed-in caller has at least min_role (viewer < editor < admin < owner) in the workspace. Used by RLS policies.';

REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, text) TO authenticated, service_role;

-- Shared trigger: block changes to columns that tie a row to its parent, for API callers.
-- TG_ARGV lists the columns. Server code (service role) and SECURITY DEFINER functions
-- run as other roles and are not affected.
CREATE OR REPLACE FUNCTION public.guard_immutable_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  col text;
  old_value text;
  new_value text;
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    FOREACH col IN ARRAY TG_ARGV LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col, col) INTO old_value, new_value USING OLD, NEW;
      IF new_value IS DISTINCT FROM old_value THEN
        RAISE EXCEPTION '%.% can''t be changed', TG_TABLE_NAME, col USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. DELIVERIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace members can manage deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Members can view deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Editors can create deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Editors can update deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can delete deliveries" ON public.deliveries;

CREATE POLICY "Members can view deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, 'viewer'));
CREATE POLICY "Editors can create deliveries" ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, 'editor'));
CREATE POLICY "Editors can update deliveries" ON public.deliveries
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'editor'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'editor'));
CREATE POLICY "Admins can delete deliveries" ON public.deliveries
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'));

-- Client-room access settings are admin-only; a delivery never changes workspace.
CREATE OR REPLACE FUNCTION public.guard_delivery_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'deliveries.workspace_id can''t be changed' USING ERRCODE = '42501';
    END IF;
    IF NOT public.has_workspace_role(OLD.workspace_id, 'admin') AND (
         NEW.passcode_hash             IS DISTINCT FROM OLD.passcode_hash
      OR NEW.share_token               IS DISTINCT FROM OLD.share_token
      OR NEW.is_download_allowed       IS DISTINCT FROM OLD.is_download_allowed
      OR NEW.is_comment_allowed        IS DISTINCT FROM OLD.is_comment_allowed
      OR NEW.notify_on_download        IS DISTINCT FROM OLD.notify_on_download
      OR NEW.expires_at                IS DISTINCT FROM OLD.expires_at
      OR NEW.silo_status               IS DISTINCT FROM OLD.silo_status
      OR NEW.silo_archived_at          IS DISTINCT FROM OLD.silo_archived_at
      OR NEW.silo_restore_requested_at IS DISTINCT FROM OLD.silo_restore_requested_at
      OR NEW.silo_restore_tier         IS DISTINCT FROM OLD.silo_restore_tier
      OR NEW.silo_restored_at          IS DISTINCT FROM OLD.silo_restored_at
      OR NEW.silo_metadata             IS DISTINCT FROM OLD.silo_metadata
    ) THEN
      RAISE EXCEPTION 'Only workspace admins can change client-room access settings' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_delivery_columns ON public.deliveries;
CREATE TRIGGER trg_guard_delivery_columns
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.guard_delivery_columns();

-- ---------------------------------------------------------------------------
-- 2. ASSETS: a file's delivery must be in the same workspace
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace members can manage assets" ON public.assets;
DROP POLICY IF EXISTS "Members can view assets" ON public.assets;
DROP POLICY IF EXISTS "Editors can add assets" ON public.assets;
DROP POLICY IF EXISTS "Editors can update assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;

CREATE POLICY "Members can view assets" ON public.assets
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, 'viewer'));
CREATE POLICY "Editors can add assets" ON public.assets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(workspace_id, 'editor')
    AND (delivery_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = assets.delivery_id AND d.workspace_id = assets.workspace_id
    ))
  );
CREATE POLICY "Editors can update assets" ON public.assets
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'editor'))
  WITH CHECK (
    public.has_workspace_role(workspace_id, 'editor')
    AND (delivery_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = assets.delivery_id AND d.workspace_id = assets.workspace_id
    ))
  );
CREATE POLICY "Admins can delete assets" ON public.assets
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'));

DROP TRIGGER IF EXISTS trg_guard_asset_columns ON public.assets;
CREATE TRIGGER trg_guard_asset_columns
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('workspace_id');

-- ---------------------------------------------------------------------------
-- 3. ASSET VERSIONS (through their asset)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace members can manage asset versions" ON public.asset_versions;
DROP POLICY IF EXISTS "Members can view asset versions" ON public.asset_versions;
DROP POLICY IF EXISTS "Editors can add asset versions" ON public.asset_versions;
DROP POLICY IF EXISTS "Editors can update asset versions" ON public.asset_versions;
DROP POLICY IF EXISTS "Admins can delete asset versions" ON public.asset_versions;

CREATE POLICY "Members can view asset versions" ON public.asset_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_versions.asset_id AND public.has_workspace_role(a.workspace_id, 'viewer')
  ));
CREATE POLICY "Editors can add asset versions" ON public.asset_versions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_versions.asset_id AND public.has_workspace_role(a.workspace_id, 'editor')
  ));
CREATE POLICY "Editors can update asset versions" ON public.asset_versions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_versions.asset_id AND public.has_workspace_role(a.workspace_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_versions.asset_id AND public.has_workspace_role(a.workspace_id, 'editor')
  ));
CREATE POLICY "Admins can delete asset versions" ON public.asset_versions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_versions.asset_id AND public.has_workspace_role(a.workspace_id, 'admin')
  ));

DROP TRIGGER IF EXISTS trg_guard_asset_version_columns ON public.asset_versions;
CREATE TRIGGER trg_guard_asset_version_columns
  BEFORE UPDATE ON public.asset_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('asset_id');

-- ---------------------------------------------------------------------------
-- 4. COMMENTS AND REPLIES: members read and post as themselves; the author or an
--    editor edits, resolves and deletes. Client comments are written by the server.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace members can manage feedback" ON public.feedback;
DROP POLICY IF EXISTS "Members can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Members can post feedback" ON public.feedback;
DROP POLICY IF EXISTS "Authors and editors can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Authors and editors can delete feedback" ON public.feedback;

CREATE POLICY "Members can view feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.asset_versions v JOIN public.assets a ON a.id = v.asset_id
    WHERE v.id = feedback.asset_version_id AND public.has_workspace_role(a.workspace_id, 'viewer')
  ));
CREATE POLICY "Members can post feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.asset_versions v JOIN public.assets a ON a.id = v.asset_id
      WHERE v.id = feedback.asset_version_id AND public.has_workspace_role(a.workspace_id, 'viewer')
    )
  );
CREATE POLICY "Authors and editors can update feedback" ON public.feedback
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.asset_versions v JOIN public.assets a ON a.id = v.asset_id
    WHERE v.id = feedback.asset_version_id
      AND (public.has_workspace_role(a.workspace_id, 'editor')
        OR (feedback.author_user_id = auth.uid() AND public.has_workspace_role(a.workspace_id, 'viewer')))
  ));
CREATE POLICY "Authors and editors can delete feedback" ON public.feedback
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.asset_versions v JOIN public.assets a ON a.id = v.asset_id
    WHERE v.id = feedback.asset_version_id
      AND (public.has_workspace_role(a.workspace_id, 'editor')
        OR (feedback.author_user_id = auth.uid() AND public.has_workspace_role(a.workspace_id, 'viewer')))
  ));

DROP TRIGGER IF EXISTS trg_guard_feedback_columns ON public.feedback;
CREATE TRIGGER trg_guard_feedback_columns
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('asset_version_id', 'author_user_id');

DROP POLICY IF EXISTS "Workspace members can manage feedback replies" ON public.feedback_replies;
DROP POLICY IF EXISTS "Members can view feedback replies" ON public.feedback_replies;
DROP POLICY IF EXISTS "Members can post feedback replies" ON public.feedback_replies;
DROP POLICY IF EXISTS "Authors and editors can update feedback replies" ON public.feedback_replies;
DROP POLICY IF EXISTS "Authors and editors can delete feedback replies" ON public.feedback_replies;

CREATE POLICY "Members can view feedback replies" ON public.feedback_replies
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.feedback f
    JOIN public.asset_versions v ON v.id = f.asset_version_id
    JOIN public.assets a ON a.id = v.asset_id
    WHERE f.id = feedback_replies.feedback_id AND public.has_workspace_role(a.workspace_id, 'viewer')
  ));
CREATE POLICY "Members can post feedback replies" ON public.feedback_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.feedback f
      JOIN public.asset_versions v ON v.id = f.asset_version_id
      JOIN public.assets a ON a.id = v.asset_id
      WHERE f.id = feedback_replies.feedback_id AND public.has_workspace_role(a.workspace_id, 'viewer')
    )
  );
CREATE POLICY "Authors and editors can update feedback replies" ON public.feedback_replies
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.feedback f
    JOIN public.asset_versions v ON v.id = f.asset_version_id
    JOIN public.assets a ON a.id = v.asset_id
    WHERE f.id = feedback_replies.feedback_id
      AND (public.has_workspace_role(a.workspace_id, 'editor')
        OR (feedback_replies.author_user_id = auth.uid() AND public.has_workspace_role(a.workspace_id, 'viewer')))
  ));
CREATE POLICY "Authors and editors can delete feedback replies" ON public.feedback_replies
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.feedback f
    JOIN public.asset_versions v ON v.id = f.asset_version_id
    JOIN public.assets a ON a.id = v.asset_id
    WHERE f.id = feedback_replies.feedback_id
      AND (public.has_workspace_role(a.workspace_id, 'editor')
        OR (feedback_replies.author_user_id = auth.uid() AND public.has_workspace_role(a.workspace_id, 'viewer')))
  ));

DROP TRIGGER IF EXISTS trg_guard_feedback_reply_columns ON public.feedback_replies;
CREATE TRIGGER trg_guard_feedback_reply_columns
  BEFORE UPDATE ON public.feedback_replies
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('feedback_id', 'author_user_id');

-- ---------------------------------------------------------------------------
-- 5. CLIENTS (replaces six overlapping policies)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members and owners can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members and owners can view clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members can create clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members can update clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Editors can create clients" ON public.clients;
DROP POLICY IF EXISTS "Editors can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Members can view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, 'viewer'));
CREATE POLICY "Editors can create clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, 'editor'));
CREATE POLICY "Editors can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'editor'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'editor'));
CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'));

DROP TRIGGER IF EXISTS trg_guard_client_columns ON public.clients;
CREATE TRIGGER trg_guard_client_columns
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('workspace_id');

-- ---------------------------------------------------------------------------
-- 6. PORTFOLIOS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace owners and members can manage portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Public can view published portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Anyone can view published portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Members and signed-in visitors can view portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Editors can create portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Editors can update portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Admins can delete portfolios" ON public.portfolios;

-- Public portfolio pages are rendered by the server with the service role.
CREATE POLICY "Members and signed-in visitors can view portfolios" ON public.portfolios
  FOR SELECT TO authenticated
  USING (is_published = true OR public.has_workspace_role(workspace_id, 'viewer'));
CREATE POLICY "Editors can create portfolios" ON public.portfolios
  FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, 'editor'));
CREATE POLICY "Editors can update portfolios" ON public.portfolios
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'editor'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'editor'));
CREATE POLICY "Admins can delete portfolios" ON public.portfolios
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'));

DROP TRIGGER IF EXISTS trg_guard_portfolio_columns ON public.portfolios;
CREATE TRIGGER trg_guard_portfolio_columns
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('workspace_id');

-- ---------------------------------------------------------------------------
-- 7. SHOWCASE PROJECTS: same-workspace checks from 20261111 kept, writes need editor
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace members can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Editors can create projects" ON public.projects;
DROP POLICY IF EXISTS "Editors can update projects" ON public.projects;
DROP POLICY IF EXISTS "Editors can delete projects" ON public.projects;

CREATE POLICY "Members can view projects" ON public.projects
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, 'viewer'));
CREATE POLICY "Editors can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(workspace_id, 'editor')
    AND EXISTS (
      SELECT 1 FROM public.portfolios p
      WHERE p.id = projects.portfolio_id AND p.workspace_id = projects.workspace_id
    )
    AND (projects.source_delivery_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = projects.source_delivery_id AND d.workspace_id = projects.workspace_id
    ))
  );
CREATE POLICY "Editors can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'editor'))
  WITH CHECK (
    public.has_workspace_role(workspace_id, 'editor')
    AND EXISTS (
      SELECT 1 FROM public.portfolios p
      WHERE p.id = projects.portfolio_id AND p.workspace_id = projects.workspace_id
    )
    AND (projects.source_delivery_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = projects.source_delivery_id AND d.workspace_id = projects.workspace_id
    ))
  );
CREATE POLICY "Editors can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'editor'));

DROP POLICY IF EXISTS "Workspace members can manage project assets" ON public.project_assets;
DROP POLICY IF EXISTS "Members can view project assets" ON public.project_assets;
DROP POLICY IF EXISTS "Editors can link project assets" ON public.project_assets;
DROP POLICY IF EXISTS "Editors can update project assets" ON public.project_assets;
DROP POLICY IF EXISTS "Editors can unlink project assets" ON public.project_assets;

CREATE POLICY "Members can view project assets" ON public.project_assets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_assets.project_id AND public.has_workspace_role(p.workspace_id, 'viewer')
  ));
CREATE POLICY "Editors can link project assets" ON public.project_assets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p JOIN public.assets a ON a.id = project_assets.asset_id
    WHERE p.id = project_assets.project_id
      AND a.workspace_id = p.workspace_id
      AND public.has_workspace_role(p.workspace_id, 'editor')
  ));
CREATE POLICY "Editors can update project assets" ON public.project_assets
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_assets.project_id AND public.has_workspace_role(p.workspace_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p JOIN public.assets a ON a.id = project_assets.asset_id
    WHERE p.id = project_assets.project_id
      AND a.workspace_id = p.workspace_id
      AND public.has_workspace_role(p.workspace_id, 'editor')
  ));
CREATE POLICY "Editors can unlink project assets" ON public.project_assets
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_assets.project_id AND public.has_workspace_role(p.workspace_id, 'editor')
  ));

-- ---------------------------------------------------------------------------
-- 8. MEMBERS: admins manage non-owners and can't grant owner; owners manage everyone;
--    anyone can leave. New members are added by the server when an invite is accepted.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner and admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can change non-owner roles" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can change any role" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins remove non-owners, owners remove anyone, members leave" ON public.workspace_members;

CREATE POLICY "Admins can change non-owner roles" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (role <> 'owner' AND public.has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (role <> 'owner' AND public.has_workspace_role(workspace_id, 'admin'));
CREATE POLICY "Owners can change any role" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'owner'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'owner'));
CREATE POLICY "Admins remove non-owners, owners remove anyone, members leave" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    public.has_workspace_role(workspace_id, 'owner')
    OR (role <> 'owner' AND (public.has_workspace_role(workspace_id, 'admin') OR user_id = auth.uid()))
  );
-- INSERT stays limited to "Workspace owners can add themselves as owner" (20261111).

CREATE OR REPLACE FUNCTION public.protect_workspace_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  -- The service role, SECURITY DEFINER code and FK cascades (workspace deletion) aren't limited.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Membership rows can''t be moved' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id INTO v_owner FROM public.workspaces WHERE id = OLD.workspace_id;
  IF OLD.user_id = v_owner AND (TG_OP = 'DELETE' OR NEW.role <> 'owner') THEN
    RAISE EXCEPTION 'The workspace owner can''t be removed or demoted; transfer ownership first' USING ERRCODE = '42501';
  END IF;

  IF OLD.role = 'owner' AND (TG_OP = 'DELETE' OR NEW.role <> 'owner') AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = OLD.workspace_id AND m.role = 'owner' AND m.user_id <> OLD.user_id
  ) THEN
    RAISE EXCEPTION 'A workspace needs at least one owner' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_workspace_owner ON public.workspace_members;
CREATE TRIGGER trg_protect_workspace_owner
  BEFORE UPDATE OR DELETE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_workspace_owner();

-- ---------------------------------------------------------------------------
-- 9. WORKSPACES: admins edit settings; ownership and the storage counter are server-only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins and owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can update workspaces" ON public.workspaces;

CREATE POLICY "Admins can update workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, 'admin'))
  WITH CHECK (public.has_workspace_role(id, 'admin'));

CREATE OR REPLACE FUNCTION public.guard_workspace_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Ownership can only be transferred by the server' USING ERRCODE = '42501';
    END IF;
    IF NEW.storage_used_bytes IS DISTINCT FROM OLD.storage_used_bytes THEN
      RAISE EXCEPTION 'storage_used_bytes is maintained by the database' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_workspace_columns ON public.workspaces;
CREATE TRIGGER trg_guard_workspace_columns
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_columns();

-- A new workspace starts with an empty storage counter, whatever the caller sends.
CREATE OR REPLACE FUNCTION public.reset_workspace_counters_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.storage_used_bytes := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_workspace_counters ON public.workspaces;
CREATE TRIGGER trg_reset_workspace_counters
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.reset_workspace_counters_on_insert();

-- ---------------------------------------------------------------------------
-- 10. INVITATIONS: admins only (was FOR ALL TO public). The invitee still sees their own
--     pending invitation ("Users can view pending invitations sent to their email").
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can view invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.workspace_invitations;

CREATE POLICY "Admins can view invitations" ON public.workspace_invitations
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'));
CREATE POLICY "Admins can create invitations" ON public.workspace_invitations
  FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid() AND public.has_workspace_role(workspace_id, 'admin'));
CREATE POLICY "Admins can update invitations" ON public.workspace_invitations
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'))
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'));
CREATE POLICY "Admins can delete invitations" ON public.workspace_invitations
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'));

DROP TRIGGER IF EXISTS trg_guard_invitation_columns ON public.workspace_invitations;
CREATE TRIGGER trg_guard_invitation_columns
  BEFORE UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('workspace_id', 'inviter_id', 'email', 'token');

-- ---------------------------------------------------------------------------
-- 11. SESSIONS: users read their own sessions, revoked ones included; only the server writes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own active sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;

CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_sessions FROM anon, authenticated;
