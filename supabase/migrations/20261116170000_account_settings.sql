-- ============================================================================
-- Account settings: password status and terms acceptance
-- Date: 2026-11-16
--
-- 1. auth_user_has_password(): whether a user has a password. Google-only users don't, so the
--    Security page offers "Set a password" instead of "Change password". Only the server calls it
--    (service role). It reads auth.users and never returns the hash.
-- 2. user_profiles.terms_version / terms_accepted_at: which Terms of Service the user accepted, and
--    when (roadmap 5.3). Only the server records them: a trigger stops API users from changing them,
--    even on their own row.
-- ============================================================================

-- 1. Password status
CREATE OR REPLACE FUNCTION public.auth_user_has_password(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT u.encrypted_password IS NOT NULL AND u.encrypted_password <> ''
     FROM auth.users AS u
     WHERE u.id = p_user_id),
    false
  )
$$;

COMMENT ON FUNCTION public.auth_user_has_password(uuid) IS
  'True when the user can sign in with a password (Google-only users can''t). Service role only.';

REVOKE EXECUTE ON FUNCTION public.auth_user_has_password(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_has_password(uuid) TO service_role;

-- 2. Terms acceptance
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

COMMENT ON COLUMN public.user_profiles.terms_version IS
  'The Terms of Service version the user accepted (lib/legal/terms.ts). Written by the server only.';
COMMENT ON COLUMN public.user_profiles.terms_accepted_at IS
  'When the user accepted terms_version. Written by the server only.';

CREATE OR REPLACE FUNCTION public.protect_terms_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (NEW.terms_version IS DISTINCT FROM OLD.terms_version
      OR NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at)
     AND coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Terms acceptance is recorded by the server only'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger functions don't need EXECUTE to fire.
REVOKE EXECUTE ON FUNCTION public.protect_terms_acceptance() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_terms_acceptance ON public.user_profiles;
CREATE TRIGGER protect_terms_acceptance
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_terms_acceptance();
