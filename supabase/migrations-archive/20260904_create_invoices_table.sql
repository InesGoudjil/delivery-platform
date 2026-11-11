CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  stripe_invoice_id TEXT,
  stripe_customer_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid',
  description TEXT NOT NULL,
  hosted_invoice_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick workspace invoice history lookups
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace members/owners can view their workspace invoices
DROP POLICY IF EXISTS "Workspace members can view invoices" ON public.invoices;
CREATE POLICY "Workspace members can view invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = invoices.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = invoices.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
  );
