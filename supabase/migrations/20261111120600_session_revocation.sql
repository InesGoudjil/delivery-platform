-- Signing a device out from the security page ends its Supabase login, not just its row.
--
-- public.user_sessions rows are keyed on the Supabase login: session_token_id holds the access
-- token's session_id claim, which is auth.sessions.id. (It used to hold a random id from the
-- cinespace_sid cookie, which couldn't be tied to a login, and deleting the cookie skipped the
-- revocation check.)
--
-- Signing out another device:
--   1. the server flags its row (service role); the middleware signs that device out on its
--      next request, for as long as its access token is still valid;
--   2. the server calls public.revoke_auth_session (service role only, below), which deletes the
--      login's auth.sessions row; its refresh tokens go with it (ON DELETE CASCADE), so the
--      device can't get a new access token.
-- "Sign out all other devices" flags the other rows and calls Supabase Auth's
-- signOut({ scope: 'others' }) with the caller's own session, which ends every other login,
-- including ones without a row.
--
-- Rows are never deleted when a login ends: a revoked row is what turns the device away while
-- its last access token is still valid.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. End one login of one user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_auth_session(p_user_id uuid, p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ended integer;
BEGIN
  IF p_user_id IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION 'revoke_auth_session needs a user id and a session id'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;

  -- Both ids must match: a session id alone never ends another user's login.
  DELETE FROM auth.sessions
  WHERE id = p_session_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS ended = ROW_COUNT;
  RETURN ended > 0;
END;
$$;

ALTER FUNCTION public.revoke_auth_session(uuid, uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.revoke_auth_session(uuid, uuid) IS
  'Ends one Supabase login of one user: deletes the auth.sessions row, and with it the refresh '
  'tokens. Returns false when the user has no such login. Server only (service role), after '
  'checking that the login belongs to the caller.';

-- Server only. Postgres lets PUBLIC execute every new function unless told otherwise.
REVOKE EXECUTE ON FUNCTION public.revoke_auth_session(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_auth_session(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Rows keyed on the old cookie ids
-- ---------------------------------------------------------------------------
-- An active row that doesn't match a live login of its user holds an old cookie id (or its
-- login has ended). The app can never match it again, and it would show on the security page as
-- a device that can't be signed out. Revoked rows stay: they're hidden and keep blocking.
-- Every signed-in user's current login gets a row on their next request.
-- auth.sessions is managed by Supabase Auth; skip this where it doesn't exist (the test database).
DO $$
BEGIN
  IF to_regclass('auth.sessions') IS NOT NULL THEN
    DELETE FROM public.user_sessions AS us
    WHERE NOT us.is_revoked
      AND NOT EXISTS (
        SELECT 1
        FROM auth.sessions AS s
        WHERE s.id::text = us.session_token_id
          AND s.user_id = us.user_id
      );
  END IF;
END
$$;
