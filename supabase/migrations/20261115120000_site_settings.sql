-- ============================================================================
-- SITE SETTINGS
-- ============================================================================
--
-- Site-wide settings set in the admin panel (Admin -> Site settings), one row per setting.
-- The first is `demo_room`: which delivery the public demo room at /demo shows, and whether the
-- landing page links to it.
--
-- Every key and the shape of its value are defined in code (lib/site-settings.ts), which checks
-- a value before saving it and falls back to the default when a row is missing or no longer
-- parses. Reads and writes go through the service role only, like the other admin tables: the
-- admin panel writes after its platform-admin check, and the public pages read through the
-- server, never from the browser.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  value jsonb NOT NULL,
  -- No foreign key: the row has to outlive the admin's account (who changed what is in
  -- admin_audit_events as well).
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_settings IS
  'Site-wide settings set in the admin panel, one row per key (e.g. demo_room). '
  'Each key is defined in lib/site-settings.ts. Service role only.';

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_settings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.site_settings TO service_role;
