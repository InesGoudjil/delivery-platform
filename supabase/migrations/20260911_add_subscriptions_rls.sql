-- ============================================================
-- Migration: Add Row Level Security (RLS) policies for subscriptions
-- ============================================================

-- Ensure RLS is enabled on subscriptions
alter table if exists public.subscriptions enable row level security;

-- Drop existing policy if exists
drop policy if exists "Workspace members can view subscriptions" on public.subscriptions;

-- Policy: Workspace members and workspace owners can view their subscriptions
create policy "Workspace members can view subscriptions"
  on public.subscriptions
  for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = subscriptions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.workspaces
      where workspaces.id = subscriptions.workspace_id
        and workspaces.owner_id = auth.uid()
    )
  );

-- Drop existing admin policy if exists
drop policy if exists "Admins can manage subscriptions" on public.subscriptions;

-- Policy: Admins can manage all subscriptions
create policy "Admins can manage subscriptions"
  on public.subscriptions
  for all
  using (
    auth.uid() in (
      select id from public.user_profiles where platform_role = 'admin'
    )
  );
