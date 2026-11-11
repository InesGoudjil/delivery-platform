-- Migration: Create user_sessions table for active session governance & device tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_id TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  browser TEXT NOT NULL DEFAULT 'Web Browser',
  browser_version TEXT,
  os TEXT NOT NULL DEFAULT 'Desktop',
  os_version TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop', -- 'desktop' | 'mobile' | 'tablet'
  city TEXT,
  country TEXT,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, is_revoked, last_active_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies are dropped first so this migration can be re-run safely.
DROP POLICY IF EXISTS "Users can view own active sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role full access on user_sessions" ON public.user_sessions;

-- Policy: Users can view their own non-revoked sessions
CREATE POLICY "Users can view own active sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_revoked = false);

-- Policy: Users can update/revoke their own sessions
CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full management
CREATE POLICY "Service role full access on user_sessions"
  ON public.user_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
