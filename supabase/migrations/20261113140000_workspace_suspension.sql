-- Migration: 20261113140000_workspace_suspension.sql
-- Suspending a workspace (roadmap 5.6; admin panel B2, plans/admin-panel-plan-2026-11-13.md).
--
-- A suspended workspace's client links and public portfolio stop working for visitors, and its
-- members can still sign in and look at their work but can't change anything (the app checks
-- workspaces.suspended_at; public pages read with the service role, so RLS isn't involved).
-- Only platform admins suspend, through the server. Safe to re-run.

-- ============================================================================
-- 1. COLUMNS
-- ============================================================================

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

COMMENT ON COLUMN public.workspaces.suspended_at IS
  'Set while the workspace is suspended by a platform admin: links and portfolio closed, changes blocked.';
COMMENT ON COLUMN public.workspaces.suspended_reason IS 'Why it was suspended (internal; also in admin_audit_events).';
COMMENT ON COLUMN public.workspaces.suspended_by IS 'The platform admin who suspended it.';

CREATE INDEX IF NOT EXISTS idx_workspaces_suspended
  ON public.workspaces (suspended_at)
  WHERE suspended_at IS NOT NULL;

-- ============================================================================
-- 2. ONLY THE SERVER SETS THEM
-- ============================================================================

-- Same guard as 20261111120000_role_aware_rls.sql, plus the suspension columns: a workspace admin
-- can't lift their own suspension through the API.
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
    IF NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
       OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason
       OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by THEN
      RAISE EXCEPTION 'Only platform admins can suspend a workspace' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- A new workspace never starts suspended, whatever the caller sends.
CREATE OR REPLACE FUNCTION public.reset_workspace_counters_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.storage_used_bytes := 0;
    NEW.suspended_at := NULL;
    NEW.suspended_reason := NULL;
    NEW.suspended_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. ADMIN READ MODEL: suspension in the workspace rows, and a 'suspended' filter
-- ============================================================================

-- The return types change, so the functions are dropped and created again (from
-- 20261113120000_admin_read_model_and_audit.sql, with the two new columns).
DROP FUNCTION IF EXISTS public.admin_list_workspaces(text, text, text, text, text, boolean, integer, integer);
DROP FUNCTION IF EXISTS public.admin_workspace_overview();

CREATE FUNCTION public.admin_workspace_overview()
RETURNS TABLE (
  id uuid,
  brand_name text,
  slug text,
  account_type text,
  created_at timestamptz,
  owner_id uuid,
  owner_email text,
  owner_name text,
  plan_id uuid,
  plan_name text,
  plan_slug text,
  plan_price_cents integer,
  plan_currency text,
  plan_interval text,
  subscription_status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- Billed through Stripe: plan changes must go through Stripe, or the webhook overwrites them.
  stripe_billed boolean,
  effective_plan_slug text,
  storage_used_bytes bigint,
  storage_limit_gb numeric,
  -- The numeric storage_gb override, when there is one.
  storage_override_gb numeric,
  deliveries_count integer,
  active_deliveries_count integer,
  members_count integer,
  last_activity_at timestamptz,
  has_overrides boolean,
  suspended_at timestamptz,
  suspended_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH delivery_counts AS (
    SELECT
      d.workspace_id,
      count(*)::integer AS deliveries_count,
      (count(*) FILTER (WHERE d.status IS DISTINCT FROM 'archived'))::integer AS active_deliveries_count,
      max(d.updated_at) AS last_delivery_at
    FROM public.deliveries d
    GROUP BY d.workspace_id
  ),
  member_counts AS (
    SELECT m.workspace_id, count(*)::integer AS members_count
    FROM public.workspace_members m
    GROUP BY m.workspace_id
  )
  SELECT
    w.id,
    w.brand_name,
    w.slug,
    w.account_type,
    w.created_at,
    w.owner_id,
    u.email::text,
    up.full_name,
    p.id,
    p.name,
    p.slug,
    p.price_cents,
    p.currency,
    p.billing_interval,
    s.status,
    s.trial_ends_at,
    s.current_period_end,
    (s.payment_provider_sub_id IS NOT NULL),
    eff.slug,
    COALESCE(w.storage_used_bytes, 0)::bigint,
    COALESCE(
      CASE WHEN jsonb_typeof(wf.features -> 'storage_gb') = 'number'
        THEN (wf.features ->> 'storage_gb')::numeric END,
      CASE WHEN jsonb_typeof(eff.features -> 'storage_gb') = 'number'
        THEN (eff.features ->> 'storage_gb')::numeric END
    ),
    CASE WHEN jsonb_typeof(wf.features -> 'storage_gb') = 'number'
      THEN (wf.features ->> 'storage_gb')::numeric END,
    COALESCE(dc.deliveries_count, 0),
    COALESCE(dc.active_deliveries_count, 0),
    COALESCE(mc.members_count, 0),
    GREATEST(w.updated_at, w.created_at, dc.last_delivery_at),
    COALESCE(wf.features <> '{}'::jsonb, false),
    w.suspended_at,
    w.suspended_reason
  FROM public.workspaces w
  LEFT JOIN auth.users u ON u.id = w.owner_id
  LEFT JOIN public.user_profiles up ON up.id = w.owner_id
  LEFT JOIN public.subscriptions s ON s.workspace_id = w.id
  LEFT JOIN public.plans p ON p.id = s.plan_id
  LEFT JOIN public.workspace_features wf ON wf.workspace_id = w.id
  LEFT JOIN delivery_counts dc ON dc.workspace_id = w.id
  LEFT JOIN member_counts mc ON mc.workspace_id = w.id
  LEFT JOIN LATERAL (
    SELECT candidate.slug, candidate.features
    FROM (
      SELECT 1 AS rank, p.slug, p.features
      WHERE s.status IN ('active', 'trialing') AND p.is_active AND p.features <> '{}'::jsonb
      UNION ALL
      SELECT 2 AS rank, starter.slug, starter.features
      FROM public.plans starter
      WHERE starter.slug = 'starter'
    ) candidate
    ORDER BY candidate.rank
    LIMIT 1
  ) eff ON true
$$;

CREATE FUNCTION public.admin_list_workspaces(
  p_search text DEFAULT NULL,
  p_plan text DEFAULT NULL,      -- a plan slug, or 'none' for workspaces without a subscription
  p_status text DEFAULT NULL,    -- a subscription status, or 'none'
  p_flag text DEFAULT NULL,      -- 'trial_ending' | 'storage_high' | 'overrides' | 'suspended'
  p_sort text DEFAULT 'created_at', -- 'created_at' | 'brand_name' | 'storage' | 'deliveries' | 'last_activity'
  p_desc boolean DEFAULT true,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  brand_name text,
  slug text,
  account_type text,
  created_at timestamptz,
  owner_id uuid,
  owner_email text,
  owner_name text,
  plan_id uuid,
  plan_name text,
  plan_slug text,
  plan_price_cents integer,
  plan_currency text,
  plan_interval text,
  subscription_status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- Billed through Stripe: plan changes must go through Stripe, or the webhook overwrites them.
  stripe_billed boolean,
  effective_plan_slug text,
  storage_used_bytes bigint,
  storage_limit_gb numeric,
  -- The numeric storage_gb override, when there is one.
  storage_override_gb numeric,
  deliveries_count integer,
  active_deliveries_count integer,
  members_count integer,
  last_activity_at timestamptz,
  has_overrides boolean,
  suspended_at timestamptz,
  suspended_reason text,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH search AS (
    SELECT
      NULLIF(btrim(p_search), '') AS term,
      '%' || replace(replace(replace(btrim(COALESCE(p_search, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pattern
  )
  SELECT o.*, count(*) OVER () AS total_count
  FROM public.admin_workspace_overview() o, search q
  WHERE (q.term IS NULL
         OR o.brand_name ILIKE q.pattern
         OR o.slug ILIKE q.pattern
         OR o.owner_email ILIKE q.pattern
         OR o.id::text = lower(q.term))
    AND (p_plan IS NULL OR (p_plan = 'none' AND o.plan_id IS NULL) OR o.plan_slug = p_plan)
    AND (p_status IS NULL OR (p_status = 'none' AND o.subscription_status IS NULL) OR o.subscription_status = p_status)
    AND (p_flag IS NULL
         OR (p_flag = 'trial_ending' AND o.subscription_status = 'trialing'
             AND o.trial_ends_at BETWEEN now() AND now() + interval '3 days')
         OR (p_flag = 'storage_high' AND o.storage_limit_gb > 0
             AND o.storage_used_bytes >= 0.9 * o.storage_limit_gb * 1073741824)
         OR (p_flag = 'overrides' AND o.has_overrides)
         OR (p_flag = 'suspended' AND o.suspended_at IS NOT NULL))
  ORDER BY
    CASE WHEN p_sort = 'brand_name' AND NOT p_desc THEN lower(o.brand_name) END ASC,
    CASE WHEN p_sort = 'brand_name' AND p_desc THEN lower(o.brand_name) END DESC,
    CASE WHEN p_sort = 'storage' AND NOT p_desc THEN o.storage_used_bytes END ASC,
    CASE WHEN p_sort = 'storage' AND p_desc THEN o.storage_used_bytes END DESC,
    CASE WHEN p_sort = 'deliveries' AND NOT p_desc THEN o.deliveries_count END ASC,
    CASE WHEN p_sort = 'deliveries' AND p_desc THEN o.deliveries_count END DESC,
    CASE WHEN p_sort = 'last_activity' AND NOT p_desc THEN o.last_activity_at END ASC NULLS FIRST,
    CASE WHEN p_sort = 'last_activity' AND p_desc THEN o.last_activity_at END DESC NULLS LAST,
    CASE WHEN NOT p_desc THEN o.created_at END ASC,
    o.created_at DESC,
    o.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

REVOKE ALL ON FUNCTION public.admin_workspace_overview() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_workspaces(text, text, text, text, text, boolean, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_workspace_overview() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_workspaces(text, text, text, text, text, boolean, integer, integer)
  TO service_role;
