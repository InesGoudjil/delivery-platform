-- ============================================================================
-- Migration: P0 Security Lockdown
-- Date: 2026-10-24
-- Description:
--   1. Neutralize privilege escalation (VULN-01):
--      - Hardcode platform_role to 'user' in handle_new_user()
--      - Add trigger to prevent non-admins from updating user_profiles.platform_role
--   2. Remediate multi-tenant RLS leaks (VULN-02):
--      - Drop public read policies on projects, assets, asset_versions
--      - Drop open public policies on feedback and feedback_replies
--      - Restrict all operations on these tables strictly to authenticated workspace members
--   3. Audit trail protection:
--      - Revoke DELETE on notification_logs and invoices from public/anon roles
-- ============================================================================

-- ============================================================================
-- 1. FIX USER PROFILE PRIVILEGE ESCALATION (VULN-01)
-- ============================================================================

-- A. Fix new user trigger: NEVER trust client-provided platform_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  suffix int := 0;
  v_workspace_id uuid;
  v_starter_plan_id uuid;
BEGIN
  -- 1. Fetch starter plan
  SELECT id INTO v_starter_plan_id
  FROM public.plans
  WHERE slug = 'starter'
  LIMIT 1;

  -- 2. Hardcode platform_role to 'user' unconditionally
  INSERT INTO public.user_profiles (id, full_name, avatar_url, platform_role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Creator'),
    new.raw_user_meta_data->>'avatar_url',
    'user' -- Hardcoded; never read metadata platform_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

  -- 3. Provision personal workspace slug
  base_slug := lower(regexp_replace(
    COALESCE(new.raw_user_meta_data->>'full_name', 'studio'),
    '[^a-z0-9\u0600-\u06FF]', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'studio'; END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) LOOP
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.workspaces (owner_id, brand_name, slug, account_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'My Studio'),
    final_slug,
    COALESCE(new.raw_user_meta_data->>'account_type', 'individual')
  )
  RETURNING id INTO v_workspace_id;

  -- 4. Set owner role in workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, new.id, 'owner');

  -- 5. Attach starter trialing subscription
  IF v_starter_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (workspace_id, plan_id, status)
    VALUES (v_workspace_id, v_starter_plan_id, 'trialing');
  END IF;

  RETURN new;
END;
$$;

-- B. Prevent non-admins from modifying platform_role on user_profiles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    IF auth.uid() IS NULL OR NOT public.is_platform_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden: Only platform administrators can modify platform_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================================================
-- 2. LOCK DOWN ROW LEVEL SECURITY (RLS) POLICIES (VULN-02)
-- ============================================================================

-- A. Drop open public read policies that expose all tenant rows
DROP POLICY IF EXISTS "Anyone with share_token can view project" ON public.projects;
DROP POLICY IF EXISTS "Anyone with share_token can view assets" ON public.assets;
DROP POLICY IF EXISTS "Anyone with share_token can view asset versions" ON public.asset_versions;

DROP POLICY IF EXISTS "Guests can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Guests can post feedback" ON public.feedback;
DROP POLICY IF EXISTS "Guests and users can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Guests and users can delete feedback" ON public.feedback;

DROP POLICY IF EXISTS "Guests and users can view feedback replies" ON public.feedback_replies;
DROP POLICY IF EXISTS "Guests and users can insert feedback replies" ON public.feedback_replies;
DROP POLICY IF EXISTS "Guests and users can update feedback replies" ON public.feedback_replies;
DROP POLICY IF EXISTS "Guests and users can delete feedback replies" ON public.feedback_replies;

-- B. Enforce strict workspace membership for projects, assets, versions, feedback
DROP POLICY IF EXISTS "Workspace members can manage projects" ON public.projects;
CREATE POLICY "Workspace members can manage projects" ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members can manage assets" ON public.assets;
CREATE POLICY "Workspace members can manage assets" ON public.assets
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = assets.project_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = assets.project_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ));

DROP POLICY IF EXISTS "Workspace members can manage asset versions" ON public.asset_versions;
CREATE POLICY "Workspace members can manage asset versions" ON public.asset_versions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.projects p ON p.id = a.project_id
    WHERE a.id = asset_versions.asset_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.projects p ON p.id = a.project_id
    WHERE a.id = asset_versions.asset_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ));

DROP POLICY IF EXISTS "Workspace members can manage feedback" ON public.feedback;
CREATE POLICY "Workspace members can manage feedback" ON public.feedback
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.asset_versions v
    JOIN public.assets a ON a.id = v.asset_id
    JOIN public.projects p ON p.id = a.project_id
    WHERE v.id = feedback.asset_version_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.asset_versions v
    JOIN public.assets a ON a.id = v.asset_id
    JOIN public.projects p ON p.id = a.project_id
    WHERE v.id = feedback.asset_version_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ));

DROP POLICY IF EXISTS "Workspace members can manage feedback replies" ON public.feedback_replies;
CREATE POLICY "Workspace members can manage feedback replies" ON public.feedback_replies
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.feedback f
    JOIN public.asset_versions v ON v.id = f.asset_version_id
    JOIN public.assets a ON a.id = v.asset_id
    JOIN public.projects p ON p.id = a.project_id
    WHERE f.id = feedback_replies.feedback_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.feedback f
    JOIN public.asset_versions v ON v.id = f.asset_version_id
    JOIN public.assets a ON a.id = v.asset_id
    JOIN public.projects p ON p.id = a.project_id
    WHERE f.id = feedback_replies.feedback_id AND public.is_workspace_member(p.workspace_id, auth.uid())
  ));

-- C. Audit trail protection: Revoke direct DELETE grants from untrusted roles
REVOKE DELETE ON public.notification_logs FROM anon, authenticated;
REVOKE DELETE ON public.invoices FROM anon, authenticated;
