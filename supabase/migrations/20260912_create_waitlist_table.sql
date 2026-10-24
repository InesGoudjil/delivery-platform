-- Waitlist Entries Table
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'registered', 'rejected')),
  referral_code TEXT NOT NULL UNIQUE,
  referred_by_id UUID REFERENCES public.waitlist_entries(id) ON DELETE SET NULL,
  referral_count INTEGER NOT NULL DEFAULT 0,
  priority_score INTEGER NOT NULL DEFAULT 0,
  invite_token TEXT UNIQUE,
  invited_at TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE,
  role TEXT,
  company_size TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist_entries(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON public.waitlist_entries(referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_invite_token ON public.waitlist_entries(invite_token);
CREATE INDEX IF NOT EXISTS idx_waitlist_ranking ON public.waitlist_entries(status, priority_score DESC, created_at ASC);

-- Database Function: Calculate accurate real-time queue position
CREATE OR REPLACE FUNCTION public.get_waitlist_position(p_entry_id UUID)
RETURNS TABLE (
  position BIGINT,
  total_pending BIGINT
) AS $$
DECLARE
  v_priority INTEGER;
  v_created_at TIMESTAMPTZ;
  v_status TEXT;
BEGIN
  -- Fetch current entry data
  SELECT priority_score, created_at, status
  INTO v_priority, v_created_at, v_status
  FROM public.waitlist_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  -- If already invited or registered, position is 0
  IF v_status != 'pending' THEN
    RETURN QUERY 
    SELECT 0::BIGINT, COUNT(*)::BIGINT 
    FROM public.waitlist_entries 
    WHERE status = 'pending';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (COUNT(*) + 1)::BIGINT AS position,
    (SELECT COUNT(*) FROM public.waitlist_entries WHERE status = 'pending')::BIGINT AS total_pending
  FROM public.waitlist_entries
  WHERE status = 'pending'
    AND (
      priority_score > v_priority
      OR (priority_score = v_priority AND created_at < v_created_at)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Allow public / anon insert for joining waitlist with defaults
CREATE POLICY "Allow public insert to waitlist"
  ON public.waitlist_entries
  FOR INSERT
  WITH CHECK (
    status = 'pending' 
    AND priority_score = 0 
    AND invite_token IS NULL
  );

-- Allow reading waitlist entry
CREATE POLICY "Allow reading waitlist entry"
  ON public.waitlist_entries
  FOR SELECT
  USING (true);
