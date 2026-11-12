-- Remove database access the app doesn't use.
--
-- The app never reads or writes a table as an anonymous visitor: public pages, the client
-- room and the public forms (waitlist, contact, portfolio inquiries) run on the server with
-- the service role. Until now the public anon key had ALL privileges on every table and could
-- call every function, so row-level security was the only thing standing in the way, and
-- anyone could insert straight into `inquiries` and `waitlist_entries`, skipping the forms'
-- honeypot and rate limits.
--
-- After this migration:
--   - anon has no table, view, sequence or function access in the public schema;
--   - signed-in users lose TRUNCATE, REFERENCES and TRIGGER (row-level security doesn't apply
--     to TRUNCATE) and can only call the helper functions that RLS policies use;
--   - the membership helpers only answer for the caller, not for any user id passed in;
--   - every SECURITY DEFINER function has a fixed search_path.
--
-- New tables and functions: tests/rls/access-control.test.ts fails if anon can reach them,
-- so grant explicitly what a new object needs. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Tables, views and sequences
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2. Public forms go through the server, which validates and rate limits them
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public insert to inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow public insert to waitlist" ON public.waitlist_entries;

-- ---------------------------------------------------------------------------
-- 3. Functions
-- ---------------------------------------------------------------------------
-- Membership helpers: only answer for the caller (RLS policies always pass auth.uid()).
-- Before, any caller could ask whether any user belongs to any workspace.
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid, u_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (u_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = ws_id AND user_id = u_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid, u_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (u_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = ws_id AND user_id = u_id AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(u_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (u_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = u_id AND platform_role = 'admin'
    );
$$;

-- Fixed search_path for every function that didn't have one.
ALTER FUNCTION public.get_waitlist_position(uuid) SET search_path = public;
ALTER FUNCTION public.sync_workspace_storage_on_version_change() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Nobody but the service role calls functions directly. Trigger functions don't need
-- EXECUTE to fire, and RLS policies need only the four helpers below.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, text) TO authenticated;

-- Supabase's per-schema defaults granted EXECUTE on new functions to anon and authenticated.
-- (Postgres still grants EXECUTE to PUBLIC on new functions; the RLS tests catch that.)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
