-- ============================================================================
-- Migration: Phase 1 P0 Security Lockdown
-- Date: 2026-11-01
-- Remediations:
--   1. VULN-01: Lock down subscriptions and invoices RLS to read-only for members/owners.
--               Eliminates unauthorized free plan upgrades via direct client updates.
--   2. VULN-02: Revoke public SELECT on waitlist_entries.
--               Stops unauthenticated scraping of user emails and invite tokens.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SUBSCRIPTIONS TABLE HARDENING (VULN-01)
-- ----------------------------------------------------------------------------

-- Drop the overly permissive FOR ALL policy that allowed workspace owners to upgrade plans for free
DROP POLICY IF EXISTS "Workspace owners can manage subscriptions" ON public.subscriptions;

-- Ensure SELECT policy remains intact for workspace members/owners
DROP POLICY IF EXISTS "Workspace members can view subscriptions" ON public.subscriptions;
CREATE POLICY "Workspace members can view subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = subscriptions.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  );

-- Only platform administrators and service_role can mutate subscriptions directly
DROP POLICY IF EXISTS "Platform admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Platform admins can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. INVOICES TABLE HARDENING (VULN-01)
-- ----------------------------------------------------------------------------

-- Drop the overly permissive FOR ALL policy that allowed workspace owners to create fake paid invoices
DROP POLICY IF EXISTS "Workspace owners can manage invoices" ON public.invoices;

-- Ensure SELECT policy remains intact for workspace members/owners
DROP POLICY IF EXISTS "Workspace members can view invoices" ON public.invoices;
CREATE POLICY "Workspace members can view invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = invoices.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = invoices.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  );

-- Only platform administrators and service_role can mutate invoices directly
DROP POLICY IF EXISTS "Platform admins can manage invoices" ON public.invoices;
CREATE POLICY "Platform admins can manage invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. WAITLIST ENTRIES TABLE HARDENING (VULN-02)
-- ----------------------------------------------------------------------------

-- Drop public read policy that leaked emails and tokens
DROP POLICY IF EXISTS "Allow reading waitlist entry" ON public.waitlist_entries;

-- Restrict SELECT exclusively to platform administrators (and service_role automatically)
DROP POLICY IF EXISTS "Platform admins can view waitlist entries" ON public.waitlist_entries;
CREATE POLICY "Platform admins can view waitlist entries"
  ON public.waitlist_entries
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Ensure public INSERT for waitlist signup remains functional with safe defaults
DROP POLICY IF EXISTS "Allow public insert to waitlist" ON public.waitlist_entries;
CREATE POLICY "Allow public insert to waitlist"
  ON public.waitlist_entries
  FOR INSERT
  WITH CHECK (
    status = 'pending' 
    AND priority_score = 0 
    AND invite_token IS NULL
  );
