-- Combined latest schema for Delivery Platform (Supabase PostgreSQL)
-- Includes base schema, tables, triggers, indices, RLS policies, and invoices table.

set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";
alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";
alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";
alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";
alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";
alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

-- 1. USER PROFILES
create table "public"."user_profiles" (
  "id"            uuid                     not null,
  "full_name"     text,
  "avatar_url"    text,
  "platform_role" text                     not null default 'user'::text,
  "last_login_at" timestamp with time zone,
  "last_login_ip" text,
  "created_at"    timestamp with time zone default now(),
  "updated_at"    timestamp with time zone default now(),
  constraint "user_profiles_pkey" primary key (id),
  constraint "user_profiles_platform_role_check" check ((platform_role = ANY (ARRAY['user'::text, 'admin'::text])))
);
alter table "public"."user_profiles" enable row level security;

-- 2. WORKSPACES
create table "public"."workspaces" (
  "id"                 uuid                     not null default gen_random_uuid(),
  "owner_id"           uuid                     not null,
  "brand_name"         text                     not null,
  "slug"               text                     not null,
  "logo_url"           text,
  "custom_domain"      text,
  "accent_color"       text                     default '#000000'::text,
  "default_language"   text                     default 'ar'::text,
  "account_type"       text                     not null default 'individual'::text,
  "storage_used_bytes" bigint                   default 0,
  "created_at"         timestamp with time zone default now(),
  "updated_at"         timestamp with time zone default now(),
  constraint "workspaces_account_type_check" check ((account_type = ANY (ARRAY['individual'::text, 'studio'::text]))),
  constraint "workspaces_custom_domain_key" unique (custom_domain),
  constraint "workspaces_default_language_check" check ((default_language = ANY (ARRAY['ar'::text, 'en'::text]))),
  constraint "workspaces_pkey" primary key (id),
  constraint "workspaces_slug_key" unique (slug)
);
alter table "public"."workspaces" enable row level security;

-- 3. WORKSPACE MEMBERS & INVITATIONS
create table "public"."workspace_members" (
  "id"           uuid                     not null default gen_random_uuid(),
  "workspace_id" uuid                     not null,
  "user_id"      uuid                     not null,
  "role"         text                     not null default 'editor'::text,
  "joined_at"    timestamp with time zone default now(),
  constraint "workspace_members_pkey" primary key (id),
  constraint "workspace_members_role_check" check ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'viewer'::text]))),
  constraint "workspace_members_workspace_id_user_id_key" unique (workspace_id, user_id)
);
alter table "public"."workspace_members" enable row level security;

create table "public"."workspace_invitations" (
  "id"           uuid                     not null default gen_random_uuid(),
  "workspace_id" uuid                     not null,
  "inviter_id"   uuid                     not null,
  "email"        text                     not null,
  "role"         text                     not null default 'editor'::text,
  "token"        text                     not null default encode(extensions.gen_random_bytes(16), 'hex'::text),
  "status"       text                     not null default 'pending'::text,
  "expires_at"   timestamp with time zone default (now() + '7 days'::interval),
  "created_at"   timestamp with time zone default now(),
  "updated_at"   timestamp with time zone default now(),
  constraint "workspace_invitations_pkey" primary key (id),
  constraint "workspace_invitations_role_check" check ((role = ANY (ARRAY['admin'::text, 'editor'::text, 'viewer'::text]))),
  constraint "workspace_invitations_status_check" check ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text]))),
  constraint "workspace_invitations_token_key" unique (token)
);
alter table "public"."workspace_invitations" enable row level security;

-- 4. CLIENTS
create table "public"."clients" (
  "id"           uuid                     not null default gen_random_uuid(),
  "workspace_id" uuid                     not null,
  "name"         text                     not null,
  "email"        text,
  "phone_number" text,
  "created_at"   timestamp with time zone default now(),
  "updated_at"   timestamp with time zone default now(),
  constraint "clients_pkey" primary key (id)
);
alter table "public"."clients" enable row level security;

-- 5. PROJECTS & ASSETS
create table "public"."projects" (
  "id"                  uuid                     not null default gen_random_uuid(),
  "workspace_id"        uuid                     not null,
  "client_id"           uuid,
  "title"               text                     not null,
  "description"         text,
  "share_token"         text                     not null default encode(extensions.gen_random_bytes(16), 'hex'::text),
  "passcode_hash"       text,
  "status"              text                     default 'in_review'::text,
  "is_download_allowed" boolean                  default false,
  "notify_on_download"  boolean                  default false,
  "approved_at"         timestamp with time zone,
  "approved_by_name"    text,
  "created_at"          timestamp with time zone default now(),
  "updated_at"          timestamp with time zone default now(),
  constraint "projects_pkey" primary key (id),
  constraint "projects_share_token_key" unique (share_token),
  constraint "projects_status_check" check ((status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'archived'::text])))
);
alter table "public"."projects" enable row level security;

create table "public"."assets" (
  "id"           uuid                     not null default gen_random_uuid(),
  "project_id"   uuid,
  "title"        text                     not null,
  "type"         text                     default 'video'::text,
  "sort_order"   integer                  default 0,
  "is_archived"  boolean                  default false,
  "created_at"   timestamp with time zone default now(),
  "updated_at"   timestamp with time zone default now(),
  "workspace_id" uuid                     not null,
  constraint "assets_pkey" primary key (id),
  constraint "assets_type_check" check ((type = ANY (ARRAY['video'::text, 'photo_gallery'::text])))
);
alter table "public"."assets" enable row level security;

create table "public"."asset_versions" (
  "id"                 uuid                     not null default gen_random_uuid(),
  "asset_id"           uuid                     not null,
  "version_number"     integer                  not null,
  "raw_file_url"       text                     not null,
  "hls_manifest_url"   text,
  "thumbnail_url"      text,
  "file_size_bytes"    bigint                   default 0,
  "duration_seconds"   numeric(10,2),
  "transcoding_status" text                     default 'pending'::text,
  "is_active_version"  boolean                  default true,
  "created_at"         timestamp with time zone default now(),
  constraint "asset_versions_pkey" primary key (id),
  constraint "asset_versions_transcoding_status_check" check ((transcoding_status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'failed'::text])))
);
alter table "public"."asset_versions" enable row level security;

-- 6. FEEDBACK
create table "public"."feedback" (
  "id"                uuid                     not null default gen_random_uuid(),
  "asset_version_id"  uuid                     not null,
  "author_user_id"    uuid,
  "author_name"       text                     not null,
  "comment_text"      text                     not null,
  "timestamp_seconds" numeric(10,2),
  "is_resolved"       boolean                  default false,
  "parent_id"         uuid,
  "created_at"        timestamp with time zone default now(),
  "updated_at"        timestamp with time zone default now(),
  constraint "feedback_pkey" primary key (id)
);
alter table "public"."feedback" enable row level security;

-- 7. PORTFOLIOS & PORTFOLIO PROJECTS
create table "public"."portfolios" (
  "id"              uuid                     not null default gen_random_uuid(),
  "workspace_id"    uuid                     not null,
  "slug"            text                     not null,
  "title"           text                     not null,
  "bio"             text,
  "cover_asset_url" text,
  "social_links"    jsonb                    default '{}'::jsonb,
  "is_published"    boolean                  default true,
  "created_at"      timestamp with time zone default now(),
  "updated_at"      timestamp with time zone default now(),
  constraint "portfolios_pkey" primary key (id),
  constraint "portfolios_slug_key" unique (slug),
  constraint "portfolios_workspace_id_key" unique (workspace_id)
);
alter table "public"."portfolios" enable row level security;

create table "public"."portfolio_projects" (
  "portfolio_id"  uuid    not null,
  "project_id"    uuid    not null,
  "display_order" integer default 0,
  constraint "portfolio_projects_pkey" primary key (portfolio_id, project_id)
);
alter table "public"."portfolio_projects" enable row level security;

-- 8. PLANS, SUBSCRIPTIONS, FEATURES & INVOICES
create table "public"."plans" (
  "id"               uuid                     not null default gen_random_uuid(),
  "name"             text                     not null,
  "slug"             text                     not null,
  "price_cents"      integer                  not null default 0,
  "currency"         text                     default 'USD'::text,
  "billing_interval" text                     default 'month'::text,
  "sort_order"       integer                  default 0,
  "is_active"        boolean                  default true,
  "stripe_price_id"  text,
  "features"         jsonb                    not null default '{}'::jsonb,
  "created_at"       timestamp with time zone default now(),
  "updated_at"       timestamp with time zone default now(),
  constraint "plans_billing_interval_check" check ((billing_interval = ANY (ARRAY['month'::text, 'year'::text]))),
  constraint "plans_pkey" primary key (id),
  constraint "plans_slug_key" unique (slug)
);
alter table "public"."plans" enable row level security;

create table "public"."subscriptions" (
  "id"                       uuid                     not null default gen_random_uuid(),
  "workspace_id"             uuid                     not null,
  "plan_id"                  uuid                     not null,
  "payment_provider_sub_id"  text,
  "payment_provider_cust_id" text,
  "status"                   text                     not null default 'trialing'::text,
  "currency"                 text                     default 'AED'::text,
  "trial_ends_at"            timestamp with time zone default (now() + '7 days'::interval),
  "current_period_end"       timestamp with time zone,
  "created_at"               timestamp with time zone default now(),
  "updated_at"               timestamp with time zone default now(),
  constraint "subscriptions_pkey" primary key (id),
  constraint "subscriptions_status_check" check ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text]))),
  constraint "subscriptions_workspace_id_key" unique (workspace_id)
);
alter table "public"."subscriptions" enable row level security;

create table "public"."workspace_features" (
  "workspace_id" uuid                     not null,
  "features"     jsonb                    not null default '{}'::jsonb,
  "updated_at"   timestamp with time zone default now(),
  constraint "workspace_features_pkey" primary key (workspace_id)
);
alter table "public"."workspace_features" enable row level security;

create table "public"."invoices" (
  "id"                 uuid                     primary key default gen_random_uuid(),
  "workspace_id"       uuid                     not null references public.workspaces(id) on delete cascade,
  "invoice_number"     text                     not null,
  "stripe_invoice_id"  text,
  "stripe_customer_id" text,
  "amount_cents"       integer                  not null default 0,
  "currency"           text                     not null default 'USD',
  "status"             text                     not null default 'paid',
  "description"        text                     not null,
  "hosted_invoice_url" text,
  "pdf_url"            text,
  "created_at"         timestamp with time zone default now(),
  "updated_at"         timestamp with time zone default now()
);
alter table "public"."invoices" enable row level security;

-- 9. NOTIFICATION LOGS
create table "public"."notification_logs" (
  "id"                  uuid                     not null default gen_random_uuid(),
  "workspace_id"        uuid                     not null,
  "client_id"           uuid,
  "project_id"          uuid,
  "channel"             text                     default 'whatsapp'::text,
  "recipient_phone"     text                     not null,
  "status"              text                     default 'queued'::text,
  "provider_message_id" text,
  "error_message"       text,
  "created_at"          timestamp with time zone default now(),
  constraint "notification_logs_channel_check" check ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text]))),
  constraint "notification_logs_pkey" primary key (id),
  constraint "notification_logs_status_check" check ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text])))
);
alter table "public"."notification_logs" enable row level security;

-- FOREIGN KEYS & CONSTRAINTS
alter table "public"."asset_versions" add constraint "asset_versions_asset_id_fkey" foreign key (asset_id) references public.assets(id) on delete cascade;
alter table "public"."feedback" add constraint "feedback_asset_version_id_fkey" foreign key (asset_version_id) references public.asset_versions(id) on delete cascade;
alter table "public"."feedback" add constraint "feedback_author_user_id_fkey" foreign key (author_user_id) references auth.users(id) on delete set null;
alter table "public"."feedback" add constraint "feedback_parent_id_fkey" foreign key (parent_id) references public.feedback(id) on delete cascade;
alter table "public"."notification_logs" add constraint "notification_logs_client_id_fkey" foreign key (client_id) references public.clients(id) on delete set null;
alter table "public"."portfolio_projects" add constraint "portfolio_projects_portfolio_id_fkey" foreign key (portfolio_id) references public.portfolios(id) on delete cascade;
alter table "public"."projects" add constraint "projects_client_id_fkey" foreign key (client_id) references public.clients(id) on delete set null;
alter table "public"."assets" add constraint "assets_project_id_fkey" foreign key (project_id) references public.projects(id) on delete cascade;
alter table "public"."notification_logs" add constraint "notification_logs_project_id_fkey" foreign key (project_id) references public.projects(id) on delete set null;
alter table "public"."portfolio_projects" add constraint "portfolio_projects_project_id_fkey" foreign key (project_id) references public.projects(id) on delete cascade;
alter table "public"."subscriptions" add constraint "subscriptions_plan_id_fkey" foreign key (plan_id) references public.plans(id);
alter table "public"."user_profiles" add constraint "user_profiles_id_fkey" foreign key (id) references auth.users(id) on delete cascade;
alter table "public"."workspace_invitations" add constraint "workspace_invitations_inviter_id_fkey" foreign key (inviter_id) references auth.users(id) on delete cascade;
alter table "public"."workspace_members" add constraint "workspace_members_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;
alter table "public"."workspaces" add constraint "workspaces_owner_id_fkey" foreign key (owner_id) references auth.users(id) on delete cascade;
alter table "public"."assets" add constraint "assets_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."clients" add constraint "clients_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."notification_logs" add constraint "notification_logs_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."portfolios" add constraint "portfolios_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."projects" add constraint "projects_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."subscriptions" add constraint "subscriptions_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."workspace_features" add constraint "workspace_features_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."workspace_invitations" add constraint "workspace_invitations_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table "public"."workspace_members" add constraint "workspace_members_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;
