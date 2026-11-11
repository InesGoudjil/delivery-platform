-- ============================================================
-- Migration: Allow workspace members to view and owners to change subscriptions & invoices
-- ============================================================

-- 1. Ensure RLS is enabled
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "Workspace members can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Workspace owners can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

-- 3. Policy: Workspace members and workspace owners can view their subscriptions
CREATE POLICY "Workspace members can view subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = subscriptions.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
  );

-- 4. Policy: Workspace owners and workspace admins can insert, update, or delete subscriptions
CREATE POLICY "Workspace owners can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = subscriptions.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.platform_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = subscriptions.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.platform_role = 'admin'
    )
  );

-- 5. Policies for Invoices: Members view, Owners manage
DROP POLICY IF EXISTS "Workspace members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Workspace owners can manage invoices" ON public.invoices;

CREATE POLICY "Workspace members can view invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = invoices.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = invoices.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage invoices"
  ON public.invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = invoices.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = invoices.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.platform_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = invoices.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = invoices.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.platform_role = 'admin'
    )
  );
