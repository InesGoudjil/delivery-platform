-- ============================================================================
-- Two-factor sign-in for everyone who turns it on
-- Date: 2026-11-16
--
-- Until now only platform admins had to enter their code. Now a user with a verified
-- authenticator must enter it before their session can read or change anything
-- (lib/security/two-factor.ts).
--
-- 1. custom_access_token_hook() adds an `mfa_enrolled` claim to every access token: true when the
--    user has a verified factor. Supabase Auth calls it only after it is turned on in the
--    dashboard (Authentication → Auth Hooks → Custom Access Token) or, locally, in
--    supabase/config.toml. See docs/auth.md.
-- 2. two_factor_satisfied() reads the token of the current request. It is false only when the
--    token says mfa_enrolled = true and the session isn't aal2 yet.
-- 3. A restrictive policy on every table with RLS applies that check to signed-in callers. The
--    middleware and the server read the same claim, so all three agree.
--
-- Until the hook is on, no token carries the claim, so the policies change nothing.
--
-- user_sessions is left out on purpose. The middleware reads the caller's own device row on every
-- request, including while they are on /mfa, to enforce device sign-out.
--
-- A table added later needs the same policy. tests/rls/two-factor.test.ts fails until it has one.
-- ============================================================================

-- 1. The access-token hook. Supabase Auth runs it as supabase_auth_admin, which owns
--    auth.mfa_factors, so it needs no SECURITY DEFINER (Supabase advises against it).
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  enrolled boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors AS f
    WHERE f.user_id = (event ->> 'user_id')::uuid
      AND f.status = 'verified'
  ) INTO enrolled;

  RETURN jsonb_build_object('claims', claims || jsonb_build_object('mfa_enrolled', enrolled));
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Supabase Auth Custom Access Token hook: adds mfa_enrolled (the user has a verified factor) to '
  'every access token. Only supabase_auth_admin may call it.';

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;

-- 2. The check the policies use. It reads only the request's token.
CREATE OR REPLACE FUNCTION public.two_factor_satisfied()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NOT coalesce((auth.jwt() -> 'mfa_enrolled') = 'true'::jsonb, false)
      OR coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

COMMENT ON FUNCTION public.two_factor_satisfied() IS
  'False when the request''s token belongs to a user with two-factor sign-in whose session is '
  'not aal2 yet (claim mfa_enrolled, added by custom_access_token_hook).';

REVOKE EXECUTE ON FUNCTION public.two_factor_satisfied() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.two_factor_satisfied() TO authenticated, service_role;

-- 3. One restrictive policy per table with RLS. Restrictive policies are ANDed with the existing
--    ones, so they can only take access away. (select ...) runs the check once per statement.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
      AND c.relname <> 'user_sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Two-factor sign-in finished" ON public.%I', t.relname);
    EXECUTE format(
      'CREATE POLICY "Two-factor sign-in finished" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
        || 'USING ((SELECT public.two_factor_satisfied())) '
        || 'WITH CHECK ((SELECT public.two_factor_satisfied()))',
      t.relname
    );
  END LOOP;
END;
$$;
