-- ============================================================================
-- Migration: 20261101000001_phase2_p1_security_lockdown.sql
-- Description: Phase 2 P1 Security Hardening & Broken Flows Resolution
--
-- 1. [VULN-05] public.workspaces:
--    Drop blanket FOR ALL policy that allowed read-only viewers to delete or hijack workspaces.
--    Split into least-privilege SELECT, INSERT, UPDATE (admin/owner only), and DELETE (strictly owner).
--
-- 2. [VULN-10] public.clients & public.notification_logs:
--    Add missing member-scoped RLS policies to prevent default deny-all block on clients and notification logs.
--    Keep notification_logs append-only (no DELETE policy).
--
-- 3. [VULN-09] public.workspace_invitations:
--    Allow authenticated users to view pending invitations addressed to their authenticated email.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. [VULN-05] Workspaces RLS Lockdown
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can access their workspaces" ON "public"."workspaces";
DROP POLICY IF EXISTS "Members can view workspaces" ON "public"."workspaces";
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON "public"."workspaces";
DROP POLICY IF EXISTS "Admins and owners can update workspaces" ON "public"."workspaces";
DROP POLICY IF EXISTS "Only owners can delete workspaces" ON "public"."workspaces";

-- SELECT: Workspace owner or any member of the workspace
CREATE POLICY "Members can view workspaces"
  ON "public"."workspaces"
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = owner_id)
    OR public.is_workspace_member(id, auth.uid())
  );

-- INSERT: Authenticated users can create workspaces, but must be designated as owner
CREATE POLICY "Authenticated users can create workspaces"
  ON "public"."workspaces"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Only workspace owner or workspace admin can modify workspace settings
CREATE POLICY "Admins and owners can update workspaces"
  ON "public"."workspaces"
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = owner_id)
    OR public.is_workspace_admin(id, auth.uid())
  )
  WITH CHECK (
    (auth.uid() = owner_id)
    OR public.is_workspace_admin(id, auth.uid())
  );

-- DELETE: Strictly the workspace owner can delete a workspace
CREATE POLICY "Only owners can delete workspaces"
  ON "public"."workspaces"
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- 2. [VULN-10] Clients RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view clients" ON "public"."clients";
DROP POLICY IF EXISTS "Workspace members can create clients" ON "public"."clients";
DROP POLICY IF EXISTS "Workspace members can update clients" ON "public"."clients";
DROP POLICY IF EXISTS "Workspace admins can delete clients" ON "public"."clients";

CREATE POLICY "Workspace members can view clients"
  ON "public"."clients"
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can create clients"
  ON "public"."clients"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update clients"
  ON "public"."clients"
  FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace admins can delete clients"
  ON "public"."clients"
  FOR DELETE
  TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. [VULN-10] Notification Logs RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view notification logs" ON "public"."notification_logs";
DROP POLICY IF EXISTS "Workspace members can record notification logs" ON "public"."notification_logs";
DROP POLICY IF EXISTS "Workspace members can update notification logs" ON "public"."notification_logs";

CREATE POLICY "Workspace members can view notification logs"
  ON "public"."notification_logs"
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can record notification logs"
  ON "public"."notification_logs"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update notification logs"
  ON "public"."notification_logs"
  FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- NOTE: No DELETE policy is created. Notification logs remain an immutable audit log.

-- ----------------------------------------------------------------------------
-- 4. [VULN-09] Workspace Invitations Email RLS Policy
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view pending invitations sent to their email" ON "public"."workspace_invitations";

CREATE POLICY "Users can view pending invitations sent to their email"
  ON "public"."workspace_invitations"
  FOR SELECT
  TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
    AND status = 'pending'
    AND expires_at > now()
  );
