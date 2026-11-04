-- ============================================================================
-- Migration: Create workspace_settings table
-- Date: 2026-10-30
-- Description:
--   Creates workspace_settings table to persist notification preferences and
--   studio link governance defaults (default link lifespan).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Notification preferences
  notify_approvals BOOLEAN NOT NULL DEFAULT true,
  notify_comments BOOLEAN NOT NULL DEFAULT true,
  notify_downloads BOOLEAN NOT NULL DEFAULT true,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  whatsapp_number TEXT,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Security / Link Governance
  default_link_expiration_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto-updating updated_at timestamp
DROP TRIGGER IF EXISTS set_workspace_settings_updated_at ON public.workspace_settings;
CREATE TRIGGER set_workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: Workspace members can view their workspace settings
DROP POLICY IF EXISTS "Workspace members can view settings" ON public.workspace_settings;
CREATE POLICY "Workspace members can view settings"
  ON public.workspace_settings FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Insert policy: Workspace owners and admins can create/initialize settings
DROP POLICY IF EXISTS "Workspace owners and admins can insert settings" ON public.workspace_settings;
CREATE POLICY "Workspace owners and admins can insert settings"
  ON public.workspace_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_settings.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_settings.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
  );

-- Update policy: Workspace owners and admins can update settings
DROP POLICY IF EXISTS "Workspace owners and admins can update settings" ON public.workspace_settings;
CREATE POLICY "Workspace owners and admins can update settings"
  ON public.workspace_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_settings.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_settings.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_settings.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_settings.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
  );

-- Auto-provision settings row on workspace creation
CREATE OR REPLACE FUNCTION public.create_workspace_settings()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  INSERT INTO public.workspace_settings (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created_settings ON public.workspaces;
CREATE TRIGGER on_workspace_created_settings
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workspace_settings();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_settings TO authenticated, service_role;
