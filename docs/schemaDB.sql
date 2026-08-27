-- ============================================================
-- CineSpace Database Schema
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. WORKSPACES
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_name text not null,
  slug text unique not null,
  logo_url text,
  custom_domain text unique,
  accent_color text default '#000000',
  default_language text default 'ar' check (default_language in ('ar', 'en')),
  account_type text not null default 'individual'
    check (account_type in ('individual', 'studio')),
  storage_used_bytes bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. WORKSPACE_FEATURES (plan-derived, per-workspace overridable)
create table if not exists public.workspace_features (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  features jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. USER_PROFILES (platform-level role)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  platform_role text not null default 'user'
    check (platform_role in ('user', 'admin')),
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. WORKSPACE_MEMBERS (per-workspace roles)
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor'
    check (role in ('owner', 'admin', 'editor', 'viewer')),
  joined_at timestamptz default now(),
  unique (workspace_id, user_id)
);

-- 5. WORKSPACE_INVITATIONS
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'editor'
    check (role in ('admin', 'editor', 'viewer')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. PLANS (admin-managed subscription tiers)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price_cents integer not null default 0,
  currency text default 'USD',
  billing_interval text default 'month' check (billing_interval in ('month', 'year')),
  sort_order integer default 0,
  is_active boolean default true,
  stripe_price_id text,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. SUBSCRIPTIONS
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  payment_provider_sub_id text,
  payment_provider_cust_id text,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),
  currency text default 'AED',
  trial_ends_at timestamptz default (now() + interval '7 days'),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. CLIENTS
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. PORTFOLIOS (1:1 with Workspace)
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  slug text not null unique,
  title text not null,
  bio text,
  cover_asset_url text,
  social_links jsonb default '{}'::jsonb,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. PROJECTS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  description text,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  passcode_hash text,
  status text default 'in_review'
    check (status in ('draft', 'in_review', 'approved', 'archived')),
  is_download_allowed boolean default false,
  notify_on_download boolean default false,
  approved_at timestamptz,
  approved_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. PORTFOLIO_PROJECTS (Junction)
create table if not exists public.portfolio_projects (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  display_order integer default 0,
  primary key (portfolio_id, project_id)
);

-- 12. ASSETS
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  type text default 'video' check (type in ('video', 'photo_gallery')),
  sort_order integer default 0,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 13. ASSET_VERSIONS
create table if not exists public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  version_number integer not null,
  raw_file_url text not null,
  hls_manifest_url text,
  thumbnail_url text,
  file_size_bytes bigint default 0,
  duration_seconds numeric(10, 2),
  transcoding_status text default 'pending'
    check (transcoding_status in ('pending', 'processing', 'ready', 'failed')),
  is_active_version boolean default true,
  created_at timestamptz default now()
);

-- 14. FEEDBACK
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  asset_version_id uuid not null references public.asset_versions(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  comment_text text not null,
  timestamp_seconds numeric(10, 2),
  is_resolved boolean default false,
  parent_id uuid references public.feedback(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 15. NOTIFICATION_LOGS
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  channel text default 'whatsapp' check (channel in ('whatsapp', 'email')),
  recipient_phone text not null,
  status text default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_workspace_members_user_id
  on public.workspace_members(user_id);
create index if not exists idx_workspace_members_workspace_id
  on public.workspace_members(workspace_id);
create index if not exists idx_invitations_token
  on public.workspace_invitations(token);
create index if not exists idx_invitations_email
  on public.workspace_invitations(email);
create index if not exists idx_projects_workspace_id
  on public.projects(workspace_id);
create index if not exists idx_projects_share_token
  on public.projects(share_token);
create index if not exists idx_assets_project_id
  on public.assets(project_id);
create index if not exists idx_asset_versions_asset_id
  on public.asset_versions(asset_id);
create index if not exists idx_feedback_asset_version_id
  on public.feedback(asset_version_id);
create index if not exists idx_feedback_timestamp
  on public.feedback(timestamp_seconds);
create index if not exists idx_portfolios_slug
  on public.portfolios(slug);
create index if not exists idx_subscriptions_plan_id
  on public.subscriptions(plan_id);
create index if not exists idx_plans_slug
  on public.plans(slug);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_workspaces_updated_at
  before update on public.workspaces
  for each row execute function update_updated_at_column();
create trigger set_workspace_features_updated_at
  before update on public.workspace_features
  for each row execute function update_updated_at_column();
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function update_updated_at_column();
create trigger set_workspace_invitations_updated_at
  before update on public.workspace_invitations
  for each row execute function update_updated_at_column();
create trigger set_plans_updated_at
  before update on public.plans
  for each row execute function update_updated_at_column();
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function update_updated_at_column();
create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function update_updated_at_column();
create trigger set_portfolios_updated_at
  before update on public.portfolios
  for each row execute function update_updated_at_column();
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function update_updated_at_column();
create trigger set_assets_updated_at
  before update on public.assets
  for each row execute function update_updated_at_column();
create trigger set_feedback_updated_at
  before update on public.feedback
  for each row execute function update_updated_at_column();

-- ============================================================
-- TRIGGER: handle_new_user (auto-create profile + workspace)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_slug text;
  final_slug text;
  suffix int := 0;
  v_workspace_id uuid;
  v_starter_plan_id uuid;
begin
  -- Get the starter plan id
  select id into v_starter_plan_id
  from public.plans
  where slug = 'starter'
  limit 1;

  -- Create user profile (platform role)
  insert into public.user_profiles (id, full_name, platform_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'platform_role', 'user')
  );

  -- Create personal workspace
  base_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'full_name', 'studio'),
    '[^a-z0-9\u0600-\u06FF]', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'studio'; end if;

  final_slug := base_slug;
  while exists (select 1 from public.workspaces where slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.workspaces (owner_id, brand_name, slug, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'My Studio'),
    final_slug,
    coalesce(new.raw_user_meta_data->>'account_type', 'individual')
  )
  returning id into v_workspace_id;

  -- Add creator as workspace owner
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  -- Create starter subscription with trial
  insert into public.subscriptions (workspace_id, plan_id, status)
  values (v_workspace_id, v_starter_plan_id, 'trialing');

  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if re-running
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: sync workspace_features when plan changes
-- ============================================================

create or replace function public.sync_workspace_features()
returns trigger as $$
begin
  insert into public.workspace_features (workspace_id, features)
  select new.workspace_id, p.features
  from public.plans p
  where p.id = new.plan_id
  on conflict (workspace_id) do update set
    features = excluded.features,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_subscription_plan_change on public.subscriptions;
create trigger on_subscription_plan_change
  after insert or update of plan_id on public.subscriptions
  for each row execute function public.sync_workspace_features();

-- ============================================================
-- TRIGGER: create workspace_features on new workspace
-- ============================================================

create or replace function public.create_workspace_features()
returns trigger as $$
declare
  v_features jsonb;
begin
  select p.features into v_features
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.workspace_id = new.id
  limit 1;

  insert into public.workspace_features (workspace_id, features)
  values (new.id, coalesce(v_features, '{}'::jsonb))
on conflict (workspace_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.create_workspace_features();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.workspaces enable row level security;
alter table public.user_profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.feedback enable row level security;
alter table public.workspace_features enable row level security;

-- Workspace features: workspace members can read; admins can manage
create policy "Members can read workspace features"
on public.workspace_features
for select
using (
  auth.uid() in (
    select user_id from public.workspace_members where workspace_id = workspace_id
  )
);

create policy "Admins can manage workspace features"
on public.workspace_features
for all
using (
  auth.uid() in (
    select id from public.user_profiles where platform_role = 'admin'
  )
);

-- Plans: public read for active plans; admin manage
create policy "Anyone can read active plans"
on public.plans
for select
using (is_active = true);

create policy "Admins can manage plans"
on public.plans
for all
using (
  auth.uid() in (
    select id from public.user_profiles where platform_role = 'admin'
  )
);

-- Workspaces: all members can access
create policy "Members can access their workspaces"
on public.workspaces
for all
using (
  auth.uid() = owner_id
  or auth.uid() in (
    select user_id from public.workspace_members where workspace_id = id
  )
);

-- User profiles: users can read their own; admins can read all
create policy "Users can read own profile"
on public.user_profiles
for select
using (id = auth.uid());

create policy "Admins can manage all profiles"
on public.user_profiles
for all
using (
  auth.uid() in (
    select id from public.user_profiles where platform_role = 'admin'
  )
);

-- Workspace members: members can view; owner/admins can manage
create policy "Members can view membership"
on public.workspace_members
for select
using (
  auth.uid() in (
    select user_id from public.workspace_members where workspace_id = workspace_id
  )
);

create policy "Owner and admins can manage members"
on public.workspace_members
for all
using (
  auth.uid() in (
    select user_id from public.workspace_members
    where workspace_id = workspace_id
    and role in ('owner', 'admin')
  )
);

-- Invitations: members can view; admins can manage
create policy "Admins can manage invitations"
on public.workspace_invitations
for all
using (
  auth.uid() in (
    select user_id from public.workspace_members
    where workspace_id = workspace_id
    and role in ('owner', 'admin')
  )
);

-- Projects: workspace members can manage
create policy "Workspace members can manage projects"
on public.projects
for all
using (
  workspace_id in (
    select wm.workspace_id from public.workspace_members wm
    where wm.user_id = auth.uid()
  )
);

-- Public access: anyone with share_token can view project
create policy "Anyone with share_token can view project"
on public.projects
for select
using (share_token is not null);

-- Feedback: public access for shared links
create policy "Guests can view feedback"
on public.feedback
for select
using (true);

create policy "Guests can post feedback"
on public.feedback
for insert
with check (true);

-- ============================================================
-- SEED DATA: Default subscription plans
-- ============================================================

insert into public.plans (name, slug, price_cents, sort_order, features) values
('Starter', 'starter', 0, 1, '{
  "storage_gb": 2,
  "client_links": 1,
  "portfolio_videos": 4,
  "team_seats": 1,
  "languages": ["en"],
  "whatsapp_delivery": false,
  "password_protected": false,
  "watermark": false,
  "branding": false,
  "download_notifications": false,
  "priority_support": false,
  "silo_archive": false,
  "white_label": false
}'::jsonb),
('Basic', 'basic', 1200, 2, '{
  "storage_gb": 100,
  "client_links": 20,
  "portfolio_videos": -1,
  "team_seats": 1,
  "languages": ["en"],
  "whatsapp_delivery": true,
  "password_protected": false,
  "watermark": false,
  "branding": false,
  "download_notifications": false,
  "priority_support": false,
  "silo_archive": false,
  "white_label": false
}'::jsonb),
('Pro', 'pro', 2900, 3, '{
  "storage_gb": 500,
  "client_links": -1,
  "portfolio_videos": -1,
  "team_seats": 1,
  "languages": ["ar", "en"],
  "whatsapp_delivery": true,
  "password_protected": true,
  "watermark": true,
  "branding": true,
  "download_notifications": true,
  "priority_support": true,
  "silo_archive": false,
  "white_label": false
}'::jsonb),
('Studio', 'studio', 6900, 4, '{
  "storage_gb": 2048,
  "client_links": -1,
  "portfolio_videos": -1,
  "team_seats": 5,
  "languages": ["ar", "en"],
  "whatsapp_delivery": true,
  "password_protected": true,
  "watermark": true,
  "branding": true,
  "download_notifications": true,
  "priority_support": true,
  "silo_archive": true,
  "white_label": true
}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  sort_order = excluded.sort_order,
  features = excluded.features;

-- ============================================================
-- BACKFILL: existing users → profiles + memberships
-- ============================================================

-- Create user_profiles for existing auth users who don't have one
insert into public.user_profiles (id, full_name, platform_role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', 'User'),
  'user'
from auth.users u
left join public.user_profiles up on up.id = u.id
where up.id is null
on conflict (id) do nothing;

-- Add existing workspace owners as members
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.workspaces w
left join public.workspace_members wm
  on wm.workspace_id = w.id and wm.user_id = w.owner_id
where wm.id is null
on conflict (workspace_id, user_id) do nothing;

-- Create starter subscriptions for workspaces without one
insert into public.subscriptions (workspace_id, plan_id, status)
select
  w.id,
  (select id from public.plans where slug = 'starter' limit 1),
  'trialing'
from public.workspaces w
left join public.subscriptions s on s.workspace_id = w.id
where s.id is null
on conflict (workspace_id) do nothing;

-- Backfill workspace_features from existing subscriptions
insert into public.workspace_features (workspace_id, features)
select s.workspace_id, p.features
from public.subscriptions s
join public.plans p on p.id = s.plan_id
left join public.workspace_features wf on wf.workspace_id = s.workspace_id
where wf.workspace_id is null
on conflict (workspace_id) do nothing;