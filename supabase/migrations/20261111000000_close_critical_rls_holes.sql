-- ============================================================================
-- Migration: Close critical tenant-isolation holes
-- Date: 2026-11-11
--
-- 0. Owner memberships: team workspaces created in the app never got their
--    owner's workspace_members row (the insert was rejected by RLS and the error
--    swallowed), and RLS only checks workspace_members. Backfill the missing rows
--    and let a workspace's owner add themselves as owner from now on.
-- 1. deliveries: the policy "Anyone with share_token can view project"
--    (USING share_token IS NOT NULL, all roles) survived the projects -> deliveries
--    rename, so anyone with the public anon key could read every delivery,
--    including share tokens and passcode hashes. The P0 lockdown dropped it under
--    the wrong names. Guests reach deliveries only through the server (service
--    role), so no public policy is needed.
-- 2. projects / project_assets: RLS was never enabled and both tables are granted
--    to anon, so anyone could read, edit or delete every studio's showcase.
--    Enable RLS, scope writes to workspace members, and only allow a project to
--    point at a portfolio, source delivery and assets from its own workspace.
--    The public portfolio page reads with the service role, so no anon policy.
-- 3. workspace_features: workspace admins could write their own plan overrides
--    (storage, seats, features). Only platform admins may write now; the app
--    writes through the service role.
-- 4. processed_billing_events: records Stripe objects that have been applied, so
--    a checkout session cannot be applied twice (storage add-on replay).
--
-- Every statement is idempotent and skips tables that do not exist.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. WORKSPACE OWNERS: make sure every owner is a member
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.workspace_members') IS NOT NULL AND to_regclass('public.workspaces') IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    SELECT w.id, w.owner_id, 'owner'
    FROM public.workspaces w
    WHERE NOT EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
    )
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    DROP POLICY IF EXISTS "Workspace owners can add themselves as owner" ON public.workspace_members;
    CREATE POLICY "Workspace owners can add themselves as owner" ON public.workspace_members
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND role = 'owner'
        AND EXISTS (
          SELECT 1 FROM public.workspaces w
          WHERE w.id = workspace_members.workspace_id
            AND w.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. DELIVERIES: remove the open SELECT policy
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.deliveries') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone with share_token can view project" ON public.deliveries;
    DROP POLICY IF EXISTS "Anyone with share_token can view delivery" ON public.deliveries;
    DROP POLICY IF EXISTS "Anyone with share_token can view deliveries" ON public.deliveries;

    -- Legacy duplicate of "Workspace members can manage deliveries", applied to
    -- PUBLIC and without WITH CHECK. The authenticated policy covers members.
    DROP POLICY IF EXISTS "Workspace members can manage projects" ON public.deliveries;

    ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

    -- Keep members' access in place even if an earlier migration never ran.
    DROP POLICY IF EXISTS "Workspace members can manage deliveries" ON public.deliveries;
    CREATE POLICY "Workspace members can manage deliveries" ON public.deliveries
      FOR ALL
      TO authenticated
      USING (public.is_workspace_member(workspace_id, auth.uid()))
      WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. PROJECTS (portfolio showcase): enable RLS and scope to the workspace
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone with share_token can view project" ON public.projects;
    DROP POLICY IF EXISTS "Workspace members can manage projects" ON public.projects;
    DROP POLICY IF EXISTS "Platform admins can view showcase projects" ON public.projects;

    CREATE POLICY "Workspace members can manage projects" ON public.projects
      FOR ALL
      TO authenticated
      USING (public.is_workspace_member(workspace_id, auth.uid()))
      WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.portfolios p
          WHERE p.id = projects.portfolio_id
            AND p.workspace_id = projects.workspace_id
        )
        AND (
          projects.source_delivery_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.deliveries d
            WHERE d.id = projects.source_delivery_id
              AND d.workspace_id = projects.workspace_id
          )
        )
      );

    -- The admin dashboard counts projects across workspaces with the user client.
    CREATE POLICY "Platform admins can view showcase projects" ON public.projects
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin(auth.uid()));

    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.projects FROM anon;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.project_assets') IS NOT NULL THEN
    ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Workspace members can manage project assets" ON public.project_assets;
    DROP POLICY IF EXISTS "Platform admins can view project assets" ON public.project_assets;

    CREATE POLICY "Workspace members can manage project assets" ON public.project_assets
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_assets.project_id
            AND public.is_workspace_member(p.workspace_id, auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          JOIN public.assets a ON a.id = project_assets.asset_id
          WHERE p.id = project_assets.project_id
            AND a.workspace_id = p.workspace_id
            AND public.is_workspace_member(p.workspace_id, auth.uid())
        )
      );

    CREATE POLICY "Platform admins can view project assets" ON public.project_assets
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin(auth.uid()));

    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.project_assets FROM anon;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. WORKSPACE_FEATURES: only platform admins (and the service role) may write
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.workspace_features') IS NOT NULL THEN
    ALTER TABLE public.workspace_features ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins can manage workspace features" ON public.workspace_features;
    DROP POLICY IF EXISTS "Platform admins can manage workspace features" ON public.workspace_features;

    CREATE POLICY "Platform admins can manage workspace features" ON public.workspace_features
      FOR ALL
      TO authenticated
      USING (public.is_platform_admin(auth.uid()))
      WITH CHECK (public.is_platform_admin(auth.uid()));

    -- "Members can read workspace features" (SELECT) stays as is.
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.workspace_features FROM anon;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. PROCESSED_BILLING_EVENTS: idempotency ledger for Stripe objects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processed_billing_events (
  id text PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.processed_billing_events IS
  'Stripe objects (checkout sessions, events) already applied to a workspace. Service role only.';

ALTER TABLE public.processed_billing_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role (which bypasses RLS) uses it.
REVOKE ALL ON public.processed_billing_events FROM anon, authenticated;
