-- Migration: 20261113130000_admin_operations.sql
-- Admin panel, Phase B (plans/admin-panel-plan-2026-11-13.md):
--   1. B3: end every Supabase login of one user ("sign out everywhere", bans, two-factor resets).
--   2. B5: scheduler heartbeats, so the admin panel can show when scheduled jobs last ran.
--   3. B7: daily trends and MRR per plan for the dashboard charts.
--
-- Service role only, like 20261113120000_admin_read_model_and_audit.sql: the app calls these on
-- the server after requirePlatformAdmin() (role from the database, plus MFA). Safe to re-run.

-- ============================================================================
-- 1. END EVERY LOGIN OF A USER
-- ============================================================================

-- Deletes all of the user's auth.sessions rows; their refresh tokens go with them (ON DELETE
-- CASCADE), so no device can get a new access token. The app also flags the user's
-- user_sessions rows revoked, which turns devices away while their last access token is valid.
-- Like revoke_auth_session (20261111120600), PL/pgSQL: Supabase Auth owns auth.sessions.
CREATE OR REPLACE FUNCTION public.admin_end_all_auth_sessions(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ended integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'admin_end_all_auth_sessions needs a user id'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;

  DELETE FROM auth.sessions WHERE user_id = p_user_id;

  GET DIAGNOSTICS ended = ROW_COUNT;
  RETURN ended;
END;
$$;

ALTER FUNCTION public.admin_end_all_auth_sessions(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.admin_end_all_auth_sessions(uuid) IS
  'Ends every Supabase login of one user (auth.sessions rows and their refresh tokens). Returns '
  'how many ended. Server only (service role), for platform admins.';

REVOKE EXECUTE ON FUNCTION public.admin_end_all_auth_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_all_auth_sessions(uuid) TO service_role;

-- ============================================================================
-- 2. SCHEDULER HEARTBEATS
-- ============================================================================

-- One row per scheduled job, written at the start and end of every run.
-- 'notifications' is /api/cron/notifications.
CREATE TABLE IF NOT EXISTS public.system_heartbeats (
  name text PRIMARY KEY,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_status text CHECK (last_status IN ('running', 'ok', 'failed')),
  last_error text,
  details jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_heartbeats IS
  'When each scheduled job last ran, and how it went. Written by the job, read by the admin panel. '
  'Service role only.';

ALTER TABLE public.system_heartbeats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.system_heartbeats FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.system_heartbeats TO service_role;

-- ============================================================================
-- 3. DASHBOARD TRENDS
-- ============================================================================

-- One row per UTC day for the last p_days days (1 to 366), oldest first: sign-ups, new
-- workspaces, new deliveries and approvals. Days without any are 0, not missing.
CREATE OR REPLACE FUNCTION public.admin_daily_series(p_days integer DEFAULT 90)
RETURNS TABLE (
  day date,
  signups integer,
  workspaces integer,
  deliveries integer,
  approvals integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH bounds AS (
    SELECT
      (now() AT TIME ZONE 'utc')::date AS last_day,
      LEAST(GREATEST(COALESCE(p_days, 90), 1), 366) AS n
  ),
  calendar AS (
    SELECT generate_series(b.last_day - (b.n - 1), b.last_day, interval '1 day')::date AS d
    FROM bounds b
  ),
  since AS (
    SELECT (min(c.d)::timestamp AT TIME ZONE 'utc') AS t FROM calendar c
  ),
  signups_by_day AS (
    SELECT (u.created_at AT TIME ZONE 'utc')::date AS d, count(*)::integer AS n
    FROM auth.users u, since s
    WHERE u.deleted_at IS NULL AND u.created_at >= s.t
    GROUP BY 1
  ),
  workspaces_by_day AS (
    SELECT (w.created_at AT TIME ZONE 'utc')::date AS d, count(*)::integer AS n
    FROM public.workspaces w, since s
    WHERE w.created_at >= s.t
    GROUP BY 1
  ),
  deliveries_by_day AS (
    SELECT (x.created_at AT TIME ZONE 'utc')::date AS d, count(*)::integer AS n
    FROM public.deliveries x, since s
    WHERE x.created_at >= s.t
    GROUP BY 1
  ),
  approvals_by_day AS (
    SELECT (x.approved_at AT TIME ZONE 'utc')::date AS d, count(*)::integer AS n
    FROM public.deliveries x, since s
    WHERE x.approved_at >= s.t
    GROUP BY 1
  )
  SELECT
    c.d,
    COALESCE(su.n, 0),
    COALESCE(ws.n, 0),
    COALESCE(dl.n, 0),
    COALESCE(ap.n, 0)
  FROM calendar c
  LEFT JOIN signups_by_day su ON su.d = c.d
  LEFT JOIN workspaces_by_day ws ON ws.d = c.d
  LEFT JOIN deliveries_by_day dl ON dl.d = c.d
  LEFT JOIN approvals_by_day ap ON ap.d = c.d
  ORDER BY c.d
$$;

-- List-price MRR per plan: active subscriptions only, annual prices divided by 12, like
-- admin_platform_kpis().
CREATE OR REPLACE FUNCTION public.admin_mrr_by_plan()
RETURNS TABLE (
  plan_id uuid,
  plan_name text,
  plan_slug text,
  currency text,
  amount_cents bigint,
  subscriptions integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.name,
    p.slug,
    COALESCE(p.currency, 'USD'),
    round(sum(CASE WHEN p.billing_interval = 'year' THEN p.price_cents / 12.0 ELSE p.price_cents END))::bigint,
    count(*)::integer
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.status = 'active' AND p.price_cents > 0
  GROUP BY p.id, p.name, p.slug, p.currency
  ORDER BY 5 DESC
$$;

REVOKE ALL ON FUNCTION public.admin_daily_series(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mrr_by_plan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_daily_series(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mrr_by_plan() TO service_role;
