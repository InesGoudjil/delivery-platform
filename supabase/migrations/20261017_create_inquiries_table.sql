-- Inquiries & Leads Table (Portfolio Inquiries, Contact Form Messages, Partnership Applications)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('portfolio_lead', 'contact_message', 'partnership_lead')),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_workspace_id ON public.inquiries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_type ON public.inquiries(type);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- Row Level Security
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Allow public / anon visitors to submit inquiries
CREATE POLICY "Allow public insert to inquiries"
  ON public.inquiries
  FOR INSERT
  WITH CHECK (true);

-- Allow workspace owners and members to read inquiries directed to their workspace
CREATE POLICY "Workspace members can view workspace inquiries"
  ON public.inquiries
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = inquiries.workspace_id
      AND wm.user_id = auth.uid()
    )) OR
    (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = inquiries.workspace_id
      AND w.owner_id = auth.uid()
    ))
  );

-- Service role full access
CREATE POLICY "Service role full access on inquiries"
  ON public.inquiries
  FOR ALL
  USING (auth.role() = 'service_role');
