set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

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

alter table "public"."asset_versions"
  enable row level security;

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

alter table "public"."assets"
  enable row level security;

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

alter table "public"."clients"
  enable row level security;

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

alter table "public"."feedback"
  enable row level security;

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

alter table "public"."notification_logs"
  enable row level security;

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

alter table "public"."plans"
  enable row level security;

create table "public"."portfolio_projects" (
  "portfolio_id"  uuid    not null,
  "project_id"    uuid    not null,
  "display_order" integer default 0,
  constraint "portfolio_projects_pkey" primary key (portfolio_id, project_id)
);

alter table "public"."portfolio_projects"
  enable row level security;

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

alter table "public"."portfolios"
  enable row level security;

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

alter table "public"."projects"
  enable row level security;

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

alter table "public"."subscriptions"
  enable row level security;

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

alter table "public"."user_profiles"
  enable row level security;

create table "public"."workspace_features" (
  "workspace_id" uuid                     not null,
  "features"     jsonb                    not null default '{}'::jsonb,
  "updated_at"   timestamp with time zone default now(),
  constraint "workspace_features_pkey" primary key (workspace_id)
);

alter table "public"."workspace_features"
  enable row level security;

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

alter table "public"."workspace_invitations"
  enable row level security;

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

alter table "public"."workspace_members"
  enable row level security;

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

alter table "public"."workspaces"
  enable row level security;

create or replace function public.create_workspace_features()
  returns trigger
  language plpgsql
  security definer
  AS $function$
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
$function$;

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  AS $function$
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
$function$;

create or replace function public.is_platform_admin (
  u_id uuid default auth.uid()
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
  AS $function$
  select exists (
    select 1
    from public.user_profiles
    where id = u_id
      and platform_role = 'admin'
  );
$function$;

create or replace function public.is_workspace_admin (
  ws_id uuid,
  u_id  uuid default auth.uid()
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
  AS $function$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = u_id
      and role in ('owner', 'admin')
  );
$function$;

create or replace function public.is_workspace_member (
  ws_id uuid,
  u_id  uuid default auth.uid()
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
  AS $function$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = u_id
  );
$function$;

create or replace function public.sync_workspace_features()
  returns trigger
  language plpgsql
  security definer
  AS $function$
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
$function$;

create or replace function public.update_updated_at_column()
  returns trigger
  language plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

alter table "public"."asset_versions"
  add constraint "asset_versions_asset_id_fkey" foreign key (asset_id) references public.assets(id) on delete cascade;

alter table "public"."feedback"
  add constraint "feedback_asset_version_id_fkey" foreign key (asset_version_id) references public.asset_versions(id) on delete cascade;

alter table "public"."feedback"
  add constraint "feedback_author_user_id_fkey" foreign key (author_user_id) references auth.users(id) on delete set null;

alter table "public"."feedback"
  add constraint "feedback_parent_id_fkey" foreign key (parent_id) references public.feedback(id) on delete cascade;

alter table "public"."notification_logs"
  add constraint "notification_logs_client_id_fkey" foreign key (client_id) references public.clients(id) on delete set null;

alter table "public"."portfolio_projects"
  add constraint "portfolio_projects_portfolio_id_fkey" foreign key (portfolio_id) references public.portfolios(id) on delete cascade;

alter table "public"."projects"
  add constraint "projects_client_id_fkey" foreign key (client_id) references public.clients(id) on delete set null;

alter table "public"."assets"
  add constraint "assets_project_id_fkey" foreign key (project_id) references public.projects(id) on delete cascade;

alter table "public"."notification_logs"
  add constraint "notification_logs_project_id_fkey" foreign key (project_id) references public.projects(id) on delete set null;

alter table "public"."portfolio_projects"
  add constraint "portfolio_projects_project_id_fkey" foreign key (project_id) references public.projects(id) on delete cascade;

alter table "public"."subscriptions"
  add constraint "subscriptions_plan_id_fkey" foreign key (plan_id) references public.plans(id);

alter table "public"."user_profiles"
  add constraint "user_profiles_id_fkey" foreign key (id) references auth.users(id) on delete cascade;

alter table "public"."workspace_invitations"
  add constraint "workspace_invitations_inviter_id_fkey" foreign key (inviter_id) references auth.users(id) on delete cascade;

alter table "public"."workspace_members"
  add constraint "workspace_members_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."workspaces"
  add constraint "workspaces_owner_id_fkey" foreign key (owner_id) references auth.users(id) on delete cascade;

alter table "public"."assets"
  add constraint "assets_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."clients"
  add constraint "clients_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."notification_logs"
  add constraint "notification_logs_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."portfolios"
  add constraint "portfolios_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."projects"
  add constraint "projects_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."subscriptions"
  add constraint "subscriptions_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."workspace_features"
  add constraint "workspace_features_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."workspace_invitations"
  add constraint "workspace_invitations_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table "public"."workspace_members"
  add constraint "workspace_members_workspace_id_fkey" foreign key (workspace_id) references public.workspaces(id) on delete cascade;

create index idx_asset_versions_asset_id on public.asset_versions using btree (asset_id);

create index idx_assets_project_id on public.assets using btree (project_id);

create index idx_assets_workspace_id on public.assets using btree (workspace_id);

create index idx_assets_workspace_unassigned on public.assets using btree (workspace_id)
  where (project_id is null);

create index idx_feedback_asset_version_id on public.feedback using btree (asset_version_id);

create index idx_feedback_timestamp on public.feedback using btree (timestamp_seconds);

create index idx_invitations_email on public.workspace_invitations using btree (email);

create index idx_invitations_token on public.workspace_invitations using btree (token);

create index idx_plans_slug on public.plans using btree (slug);

create index idx_portfolios_slug on public.portfolios using btree (slug);

create index idx_projects_share_token on public.projects using btree (share_token);

create index idx_projects_workspace_id on public.projects using btree (workspace_id);

create index idx_subscriptions_plan_id on public.subscriptions using btree (plan_id);

create index idx_workspace_members_user_id on public.workspace_members using btree (user_id);

create index idx_workspace_members_workspace_id on public.workspace_members using btree (workspace_id);

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create trigger set_assets_updated_at
  before update on public.assets
  for each row
  execute function public.update_updated_at_column();

create trigger set_clients_updated_at
  before update on public.clients
  for each row
  execute function public.update_updated_at_column();

create trigger set_feedback_updated_at
  before update on public.feedback
  for each row
  execute function public.update_updated_at_column();

create trigger set_plans_updated_at
  before update on public.plans
  for each row
  execute function public.update_updated_at_column();

create trigger set_portfolios_updated_at
  before update on public.portfolios
  for each row
  execute function public.update_updated_at_column();

create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute function public.update_updated_at_column();

create trigger on_subscription_plan_change
  after insert or update of plan_id on public.subscriptions
  for each row
  execute function public.sync_workspace_features();

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.update_updated_at_column();

create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row
  execute function public.update_updated_at_column();

create trigger set_workspace_features_updated_at
  before update on public.workspace_features
  for each row
  execute function public.update_updated_at_column();

create trigger set_workspace_invitations_updated_at
  before update on public.workspace_invitations
  for each row
  execute function public.update_updated_at_column();

create trigger on_workspace_created
  after insert on public.workspaces
  for each row
  execute function public.create_workspace_features();

create trigger set_workspaces_updated_at
  before update on public.workspaces
  for each row
  execute function public.update_updated_at_column();

create policy "Anyone with share_token can view asset versions" on "public"."asset_versions"
  for select
  to PUBLIC
  using ((exists ( select 1
   from (public.assets a
     JOIN public.projects p on ((p.id = a.project_id)))
  where ((a.id = asset_versions.asset_id) AND (p.share_token is not null)))));

create policy "Workspace members can manage asset versions" on "public"."asset_versions"
  for all
  to PUBLIC
  using ((exists ( select 1
   from (public.assets a
     JOIN public.projects p on ((p.id = a.project_id)))
  where ((a.id = asset_versions.asset_id) AND public.is_workspace_member(p.workspace_id, auth.uid())))));

create policy "Anyone with share_token can view assets" on "public"."assets"
  for select
  to PUBLIC
  using ((exists ( select 1
   from public.projects p
  where ((p.id = assets.project_id) AND (p.share_token is not null)))));

create policy "Workspace members can manage assets" on "public"."assets"
  for all
  to PUBLIC
  using ((exists ( select 1
   from public.projects p
  where ((p.id = assets.project_id) AND public.is_workspace_member(p.workspace_id, auth.uid())))));

create policy "Guests can post feedback" on "public"."feedback"
  for insert
  to PUBLIC
  with check (true);

create policy "Guests can view feedback" on "public"."feedback"
  for select
  to PUBLIC
  using (true);

create policy "Admins can manage plans" on "public"."plans"
  for all
  to PUBLIC
  using (public.is_platform_admin(auth.uid()));

create policy "Anyone can read active plans" on "public"."plans"
  for select
  to PUBLIC
  using ((is_active = true));

create policy "Public can view featured portfolio projects" on "public"."portfolio_projects"
  for select
  to PUBLIC
  using (true);

create policy "Workspace members can manage portfolio projects" on "public"."portfolio_projects"
  for all
  to "authenticated"
  using ((portfolio_id in ( select p.id
   from (public.portfolios p
     JOIN public.workspaces w on ((w.id = p.workspace_id)))
  where (w.owner_id = auth.uid()))))
  with check ((portfolio_id IN ( SELECT p.id
   FROM (public.portfolios p
     JOIN public.workspaces w ON ((w.id = p.workspace_id)))
  WHERE (w.owner_id = auth.uid()))));

create policy "Public can view published portfolios" on "public"."portfolios"
  for select
  to PUBLIC
  using (((is_published = true) or ((auth.uid() is not null) AND (workspace_id in ( select workspaces.id
   from public.workspaces
  where (workspaces.owner_id = auth.uid()))))));

create policy "Workspace owners and members can manage portfolios" on "public"."portfolios"
  for all
  to "authenticated"
  using ((workspace_id in ( select workspaces.id
   from public.workspaces
  where (workspaces.owner_id = auth.uid())
UNION
 select workspace_members.workspace_id
   from public.workspace_members
  where (workspace_members.user_id = auth.uid()))))
  with check ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.owner_id = auth.uid())
UNION
 SELECT workspace_members.workspace_id
   FROM public.workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));

create policy "Anyone with share_token can view project" on "public"."projects"
  for select
  to PUBLIC
  using ((share_token is not null));

create policy "Workspace members can manage projects" on "public"."projects"
  for all
  to PUBLIC
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Admins can manage all profiles" on "public"."user_profiles"
  for all
  to PUBLIC
  using (public.is_platform_admin(auth.uid()));

create policy "Users can read own profile" on "public"."user_profiles"
  for select
  to PUBLIC
  using (((id = auth.uid()) or public.is_platform_admin(auth.uid())));

create policy "Users can update own profile" on "public"."user_profiles"
  for update
  to PUBLIC
  using ((id = auth.uid()))
  with check ((id = auth.uid()));

create policy "Admins can manage workspace features" on "public"."workspace_features"
  for all
  to PUBLIC
  using ((public.is_platform_admin(auth.uid()) or public.is_workspace_admin(workspace_id, auth.uid())));

create policy "Members can read workspace features" on "public"."workspace_features"
  for select
  to PUBLIC
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Admins can manage invitations" on "public"."workspace_invitations"
  for all
  to PUBLIC
  using (public.is_workspace_admin(workspace_id, auth.uid()));

create policy "Members can view membership" on "public"."workspace_members"
  for select
  to PUBLIC
  using (((user_id = auth.uid()) or public.is_workspace_member(workspace_id, auth.uid())));

create policy "Owner and admins can manage members" on "public"."workspace_members"
  for all
  to PUBLIC
  using (public.is_workspace_admin(workspace_id, auth.uid()));

create policy "Members can access their workspaces" on "public"."workspaces"
  for all
  to PUBLIC
  using (((auth.uid() = owner_id) or public.is_workspace_member(id, auth.uid())));

grant execute on function "public"."create_workspace_features"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."handle_new_user"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."is_platform_admin"(uuid) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."is_workspace_admin"(uuid, uuid) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."is_workspace_member"(uuid, uuid) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."sync_workspace_features"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."update_updated_at_column"() to public, "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."asset_versions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."assets" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."clients" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."feedback" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."notification_logs" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."plans" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."portfolio_projects" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."portfolios" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."projects" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."subscriptions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."user_profiles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workspace_features" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workspace_invitations" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workspace_members" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."workspaces" to "anon", "authenticated", "postgres", "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

