-- Migration: 20261113120000_admin_read_model_and_audit.sql
-- Admin panel, Phase A (plans/admin-panel-plan-2026-11-13.md, sections 3.2 and 3.3):
--   1. admin_audit_events: an append-only record of every platform-admin change.
--   2. Read-model functions for the admin pages: one query per page instead of one per row,
--      across every workspace (platform admins have no tenant-level read access, by design).
--
-- Everything here is for the service role only. The app calls it on the server after
-- requirePlatformAdmin() (role from the database, plus MFA) has passed. anon and authenticated
-- can't read, write or execute any of it: the functions read auth.users (emails, sign-ins,
-- bans, MFA), which must never reach the public API. Safe to re-run.

-- ============================================================================
-- 1. AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No foreign key: the record has to outlive the admin's account.
  actor_id uuid,
  actor_email text,
  -- Dotted lowercase names, e.g. 'workspace.change_plan', 'user.change_role'.
  action text NOT NULL CHECK (action ~ '^[a-z][a-z_]*(\.[a-z][a-z_]*)+$'),
  target_type text NOT NULL,
  target_id text,
  target_label text,
  reason text,
  outcome text NOT NULL DEFAULT 'succeeded' CHECK (outcome IN ('succeeded', 'failed')),
  error_message text,
  -- { "before": ..., "after": ... } for what the action changed.
  changes jsonb,
  request_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_events IS
  'Append-only log of platform-admin changes: who, what, why, before and after. Service role only.';

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_created
  ON public.admin_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_events_target
  ON public.admin_audit_events (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_events_actor
  ON public.admin_audit_events (actor_id, created_at DESC);

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_audit_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.admin_audit_events TO service_role;

CREATE OR REPLACE FUNCTION public.admin_audit_events_are_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_events is append-only' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_audit_events_are_append_only() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS admin_audit_events_no_update_or_delete ON public.admin_audit_events;
CREATE TRIGGER admin_audit_events_no_update_or_delete
  BEFORE UPDATE OR DELETE ON public.admin_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.admin_audit_events_are_append_only();

DROP TRIGGER IF EXISTS admin_audit_events_no_truncate ON public.admin_audit_events;
CREATE TRIGGER admin_audit_events_no_truncate
  BEFORE TRUNCATE ON public.admin_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.admin_audit_events_are_append_only();

-- ============================================================================
-- 2. READ MODEL
-- ============================================================================

-- One row per workspace with what the admin lists show. The effective plan follows
-- SubscriptionService.getCurrentPlan(): the subscribed plan while the subscription is active
-- or trialing and the plan is active, otherwise the 'starter' plan. The storage limit follows
-- getFeatures(): a numeric storage_gb override wins over the effective plan's. Values that
-- aren't numbers are ignored instead of breaking the query.
CREATE OR REPLACE FUNCTION public.admin_workspace_overview()
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
  has_overrides boolean
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
    COALESCE(wf.features <> '{}'::jsonb, false)
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

-- A page of workspaces. Search matches the brand name, slug or owner email (substring) or the
-- exact workspace id. Sort columns are fixed here; anything else sorts by newest first.
CREATE OR REPLACE FUNCTION public.admin_list_workspaces(
  p_search text DEFAULT NULL,
  p_plan text DEFAULT NULL,      -- a plan slug, or 'none' for workspaces without a subscription
  p_status text DEFAULT NULL,    -- a subscription status, or 'none'
  p_flag text DEFAULT NULL,      -- 'trial_ending' | 'storage_high' | 'overrides'
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
         OR (p_flag = 'overrides' AND o.has_overrides))
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

-- A page of users, read from Supabase Auth (deleted accounts left out). Search matches the
-- email or full name (substring) or the exact user id.
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL,
  p_role text DEFAULT NULL,      -- 'admin' | 'user'
  p_flag text DEFAULT NULL,      -- 'unconfirmed' | 'banned' | 'no_mfa'
  p_sort text DEFAULT 'created_at', -- 'created_at' | 'email' | 'last_sign_in'
  p_desc boolean DEFAULT true,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  platform_role text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  mfa_enabled boolean,
  owned_workspaces integer,
  memberships integer,
  primary_workspace_id uuid,
  primary_workspace_name text,
  primary_workspace_slug text,
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
  ),
  base AS (
    SELECT
      u.id,
      u.email::text AS email,
      up.full_name,
      up.avatar_url,
      COALESCE(up.platform_role, 'user') AS platform_role,
      u.created_at,
      u.email_confirmed_at,
      u.last_sign_in_at,
      u.banned_until,
      EXISTS (
        SELECT 1 FROM auth.mfa_factors f
        WHERE f.user_id = u.id AND f.status::text = 'verified'
      ) AS mfa_enabled,
      (SELECT count(*)::integer FROM public.workspaces w WHERE w.owner_id = u.id) AS owned_workspaces,
      (SELECT count(*)::integer FROM public.workspace_members m WHERE m.user_id = u.id) AS memberships,
      pw.id AS primary_workspace_id,
      pw.brand_name AS primary_workspace_name,
      pw.slug AS primary_workspace_slug
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.id = u.id
    LEFT JOIN LATERAL (
      SELECT w.id, w.brand_name, w.slug
      FROM public.workspaces w
      WHERE w.owner_id = u.id
      ORDER BY w.created_at
      LIMIT 1
    ) pw ON true
    WHERE u.deleted_at IS NULL
  )
  SELECT b.*, count(*) OVER () AS total_count
  FROM base b, search q
  WHERE (q.term IS NULL
         OR b.email ILIKE q.pattern
         OR b.full_name ILIKE q.pattern
         OR b.id::text = lower(q.term))
    AND (p_role IS NULL OR b.platform_role = p_role)
    AND (p_flag IS NULL
         OR (p_flag = 'unconfirmed' AND b.email_confirmed_at IS NULL)
         OR (p_flag = 'banned' AND b.banned_until > now())
         OR (p_flag = 'no_mfa' AND NOT b.mfa_enabled))
  ORDER BY
    CASE WHEN p_sort = 'email' AND NOT p_desc THEN lower(b.email) END ASC,
    CASE WHEN p_sort = 'email' AND p_desc THEN lower(b.email) END DESC,
    CASE WHEN p_sort = 'last_sign_in' AND NOT p_desc THEN b.last_sign_in_at END ASC NULLS FIRST,
    CASE WHEN p_sort = 'last_sign_in' AND p_desc THEN b.last_sign_in_at END DESC NULLS LAST,
    CASE WHEN NOT p_desc THEN b.created_at END ASC,
    b.created_at DESC,
    b.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

-- The dashboard's numbers in one call. MRR is list price: active subscriptions only (trials
-- excluded), annual prices divided by 12, one figure per currency. Discounts live in Stripe.
CREATE OR REPLACE FUNCTION public.admin_platform_kpis()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH o AS (
    SELECT * FROM public.admin_workspace_overview()
  ),
  mrr AS (
    SELECT
      COALESCE(o.plan_currency, 'USD') AS currency,
      round(sum(CASE WHEN o.plan_interval = 'year' THEN o.plan_price_cents / 12.0
                     ELSE o.plan_price_cents END))::bigint AS amount_cents,
      count(*)::integer AS subscriptions
    FROM o
    WHERE o.subscription_status = 'active' AND o.plan_price_cents > 0
    GROUP BY COALESCE(o.plan_currency, 'USD')
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'workspaces', (SELECT count(*) FROM o),
    'workspaces_new_7d', (SELECT count(*) FROM o WHERE o.created_at >= now() - interval '7 days'),
    'users', (SELECT count(*) FROM auth.users u WHERE u.deleted_at IS NULL),
    'signups_7d', (
      SELECT count(*) FROM auth.users u
      WHERE u.deleted_at IS NULL AND u.created_at >= now() - interval '7 days'
    ),
    'subscriptions', jsonb_build_object(
      'active', (SELECT count(*) FROM o WHERE o.subscription_status = 'active'),
      'trialing', (SELECT count(*) FROM o WHERE o.subscription_status = 'trialing'),
      'past_due', (SELECT count(*) FROM o WHERE o.subscription_status = 'past_due'),
      'canceled', (SELECT count(*) FROM o WHERE o.subscription_status = 'canceled'),
      'none', (SELECT count(*) FROM o WHERE o.subscription_status IS NULL)
    ),
    'mrr', COALESCE(
      (SELECT jsonb_agg(
                jsonb_build_object('currency', m.currency, 'amount_cents', m.amount_cents, 'subscriptions', m.subscriptions)
                ORDER BY m.amount_cents DESC)
       FROM mrr m),
      '[]'::jsonb
    ),
    'trials_ending_3d', (
      SELECT count(*) FROM o
      WHERE o.subscription_status = 'trialing' AND o.trial_ends_at BETWEEN now() AND now() + interval '3 days'
    ),
    'storage_used_bytes', (SELECT COALESCE(sum(o.storage_used_bytes), 0) FROM o),
    'storage_provisioned_gb', (SELECT COALESCE(sum(o.storage_limit_gb) FILTER (WHERE o.storage_limit_gb > 0), 0) FROM o),
    'storage_high', (
      SELECT count(*) FROM o
      WHERE o.storage_limit_gb > 0 AND o.storage_used_bytes >= 0.9 * o.storage_limit_gb * 1073741824
    ),
    'deliveries', (SELECT count(*) FROM public.deliveries),
    'deliveries_7d', (SELECT count(*) FROM public.deliveries d WHERE d.created_at >= now() - interval '7 days'),
    'deliveries_30d', (SELECT count(*) FROM public.deliveries d WHERE d.created_at >= now() - interval '30 days'),
    'approvals_7d', (SELECT count(*) FROM public.deliveries d WHERE d.approved_at >= now() - interval '7 days'),
    'notifications_failed_24h', (
      SELECT count(*) FROM public.notification_logs n
      WHERE n.status = 'failed' AND n.created_at >= now() - interval '24 hours'
    ),
    -- A batch still waiting 15 minutes after its window closed means the scheduled
    -- notifications route isn't running.
    'comment_batches_overdue', (
      SELECT count(*) FROM public.comment_email_batches b WHERE b.send_at < now() - interval '15 minutes'
    ),
    'waitlist_pending', (SELECT count(*) FROM public.waitlist_entries e WHERE e.status = 'pending')
  )
$$;

-- ============================================================================
-- 3. ACCESS: service role only
-- ============================================================================

REVOKE ALL ON FUNCTION public.admin_workspace_overview() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_workspaces(text, text, text, text, text, boolean, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, text, text, boolean, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_platform_kpis() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_workspace_overview() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_workspaces(text, text, text, text, text, boolean, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, text, text, boolean, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_platform_kpis() TO service_role;
