-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. WORKSPACES
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  brand_name text not null,
  slug text unique not null,
  logo_url text,
  custom_domain text unique,
  accent_color text default '#000000',
  default_language text default 'ar' check (default_language in ('ar', 'en')),
  storage_limit_bytes bigint default 53687091200, -- Default 50GB
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. SUBSCRIPTIONS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  payment_provider_sub_id text,
  payment_provider_cust_id text,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  currency text default 'AED',
  trial_ends_at timestamptz default (now() + interval '7 days'),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone_number text, -- Target for WhatsApp delivery links
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. PORTFOLIOS (Strict 1:1 with Workspace)
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  slug text not null unique, -- cut.app/p/studio-name
  title text not null,
  bio text,
  cover_asset_url text,
  social_links jsonb default '{}'::jsonb, -- { "instagram": "...", "youtube": "..." }
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  description text,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  passcode_hash text,
  status text default 'in_review' check (status in ('draft', 'in_review', 'approved', 'archived')),
  is_download_allowed boolean default false,
  approved_at timestamptz,
  approved_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. PORTFOLIO_PROJECTS (Junction Table for Featured Projects)
create table public.portfolio_projects (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  display_order integer default 0,
  primary key (portfolio_id, project_id)
);

-- 7. ASSETS
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  type text default 'video' check (type in ('video', 'photo_gallery')),
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. ASSET_VERSIONS
create table public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  version_number integer not null,
  raw_file_url text not null, -- S3/R2 direct download link
  hls_manifest_url text, -- .m3u8 stream path
  thumbnail_url text,
  file_size_bytes bigint default 0,
  duration_seconds numeric(10, 2),
  transcoding_status text default 'pending' check (transcoding_status in ('pending', 'processing', 'ready', 'failed')),
  is_active_version boolean default true,
  created_at timestamptz default now()
);

-- 9. FEEDBACK
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  asset_version_id uuid not null references public.asset_versions(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null, -- Null for guest clients
  author_name text not null, -- 'Creator' or 'Client Name'
  comment_text text not null,
  timestamp_seconds numeric(10, 2), -- Frame/time-accurate video marker
  is_resolved boolean default false,
  parent_id uuid references public.feedback(id) on delete cascade, -- Enables threaded replies
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. NOTIFICATION_LOGS (WhatsApp Dispatch Audit)
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  channel text default 'whatsapp' check (channel in ('whatsapp', 'email')),
  recipient_phone text not null,
  status text default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz default now()
);

---
--- INDEXES FOR HIGH-PERFORMANCE LOOKUPS
---

create index idx_projects_workspace_id on public.projects(workspace_id);
create index idx_projects_share_token on public.projects(share_token);
create index idx_assets_project_id on public.assets(project_id);
create index idx_asset_versions_asset_id on public.asset_versions(asset_id);
create index idx_feedback_asset_version_id on public.feedback(asset_version_id);
create index idx_feedback_timestamp on public.feedback(timestamp_seconds);
create index idx_portfolios_slug on public.portfolios(slug);

---
--- AUTOMATIC UPDATED_AT TRIGGER FUNCTION
---

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_workspaces_updated_at before update on public.workspaces for each row execute function update_updated_at_column();
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function update_updated_at_column();
create trigger set_clients_updated_at before update on public.clients for each row execute function update_updated_at_column();
create trigger set_portfolios_updated_at before update on public.portfolios for each row execute function update_updated_at_column();
create trigger set_projects_updated_at before update on public.projects for each row execute function update_updated_at_column();
create trigger set_assets_updated_at before update on public.assets for each row execute function update_updated_at_column();
create trigger set_feedback_updated_at before update on public.feedback for each row execute function update_updated_at_column();

---
--- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
---

alter table public.workspaces enable row level security;
alter table public.projects enable row level security;
alter table public.feedback enable row level security;

-- Workspace RLS: Owners have full control
create policy "Owners can manage their workspace"
on public.workspaces
for all
using (auth.uid() = owner_id);

-- Project RLS: Owners can access their projects
create policy "Workspace owners can manage projects"
on public.projects
for all
using (
  workspace_id in (
    select id from public.workspaces where owner_id = auth.uid()
  )
);

-- Public Read Policy for Shared Projects (Zero-login Client Access via share_token)
create policy "Anyone with share_token can view project"
on public.projects
for select
using (share_token is not null);

-- Public Read/Write for Feedback on shared links
create policy "Guests can view feedback for accessible versions"
on public.feedback
for select
using (true);

create policy "Guests can post feedback on accessible versions"
on public.feedback
for insert
with check (true);