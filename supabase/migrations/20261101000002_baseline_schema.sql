-- ============================================================================
-- Baseline schema (squashed)
-- Date: 2026-11-11
--
-- Replaces every migration up to and including 20261101000001. Those files are
-- kept for reference in supabase/migrations-archive/ but could no longer rebuild
-- the database: the projects -> deliveries rename, the portfolio
-- projects/project_assets tables and several columns and policies were changed
-- in the Supabase dashboard and never captured in a migration. That drift is how
-- the open "Anyone with share_token can view project" policy went unnoticed.
--
-- Source: schema-only dump of the production public schema taken 2026-11-06
-- (after 20261101000001), plus the auth.users signup trigger, which lives in the
-- auth schema and is therefore missing from a public-schema dump. One line was
-- dropped from the dump: an index on public.user_sessions, a table that
-- 20261102000000 creates (with its own indexes) after this baseline.
--
-- Existing databases already contain all of this. Mark this version as applied
-- instead of running it: see docs/database-migrations.md.
-- ============================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_workspace_features"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_workspace_features"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workspace_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.workspace_settings (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_workspace_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_waitlist_position"("p_entry_id" "uuid") RETURNS TABLE("position" bigint, "total_pending" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_waitlist_position"("p_entry_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  base_slug text;
  final_slug text;
  suffix int := 0;
  v_workspace_id uuid;
  v_starter_plan_id uuid;
BEGIN
  -- 1. Fetch starter plan
  SELECT id INTO v_starter_plan_id
  FROM public.plans
  WHERE slug = 'starter'
  LIMIT 1;

  -- 2. Hardcode platform_role to 'user' unconditionally
  INSERT INTO public.user_profiles (id, full_name, avatar_url, platform_role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Creator'),
    new.raw_user_meta_data->>'avatar_url',
    'user' -- Hardcoded; never read metadata platform_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

  -- 3. Provision personal workspace slug
  base_slug := lower(regexp_replace(
    COALESCE(new.raw_user_meta_data->>'full_name', 'studio'),
    '[^a-z0-9\u0600-\u06FF]', '-', 'g'
  ));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'studio'; END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) LOOP
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.workspaces (owner_id, brand_name, slug, account_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'My Studio'),
    final_slug,
    COALESCE(new.raw_user_meta_data->>'account_type', 'individual')
  )
  RETURNING id INTO v_workspace_id;

  -- 4. Set owner role in workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, new.id, 'owner');

  -- 5. Attach starter trialing subscription
  IF v_starter_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (workspace_id, plan_id, status)
    VALUES (v_workspace_id, v_starter_plan_id, 'trialing');
  END IF;

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"("u_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_profiles
    where id = u_id
      and platform_role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_platform_admin"("u_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_admin"("ws_id" "uuid", "u_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = u_id
      and role in ('owner', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_workspace_admin"("ws_id" "uuid", "u_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_member"("ws_id" "uuid", "u_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = u_id
  );
$$;


ALTER FUNCTION "public"."is_workspace_member"("ws_id" "uuid", "u_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
    IF auth.uid() IS NULL OR NOT public.is_platform_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Forbidden: Only platform administrators can modify platform_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_role_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_workspace_features"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_workspace_features"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."asset_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "raw_file_url" "text" NOT NULL,
    "hls_manifest_url" "text",
    "thumbnail_url" "text",
    "file_size_bytes" bigint DEFAULT 0,
    "duration_seconds" numeric(10,2),
    "transcoding_status" "text" DEFAULT 'pending'::"text",
    "is_active_version" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "label" "text" DEFAULT 'V1'::"text",
    "silo_archive_key" "text",
    "silo_storage_class" "text" DEFAULT 'DEEP_ARCHIVE'::"text",
    CONSTRAINT "asset_versions_transcoding_status_check" CHECK (("transcoding_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'ready'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."asset_versions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."asset_versions"."silo_archive_key" IS 'AWS S3 object key in Glacier Deep Archive bucket';



COMMENT ON COLUMN "public"."asset_versions"."silo_storage_class" IS 'S3 Storage class (DEEP_ARCHIVE or GLACIER)';



CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_id" "uuid",
    "title" "text" NOT NULL,
    "type" "text" DEFAULT 'video'::"text",
    "sort_order" integer DEFAULT 0,
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "workspace_id" "uuid" NOT NULL,
    "is_approved" boolean DEFAULT false,
    "aspect_ratio" "text" DEFAULT '16:9'::"text",
    "category" "text" DEFAULT 'film'::"text",
    "views_count" integer DEFAULT 0,
    CONSTRAINT "assets_type_check" CHECK (("type" = ANY (ARRAY['video'::"text", 'photo_gallery'::"text"])))
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "share_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text") NOT NULL,
    "passcode_hash" "text",
    "status" "text" DEFAULT 'in_review'::"text",
    "is_download_allowed" boolean DEFAULT false,
    "notify_on_download" boolean DEFAULT false,
    "approved_at" timestamp with time zone,
    "approved_by_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "location" "text",
    "delivery_date" "text",
    "is_watermarked" boolean DEFAULT false,
    "appearance" "jsonb" DEFAULT '{"cardSize": "M", "showCardInfo": true, "thumbnailScale": "Fill", "watermarkMedia": true, "aspectRatioSetting": "masonry"}'::"jsonb",
    "silo_status" "text",
    "silo_archived_at" timestamp with time zone,
    "silo_restore_requested_at" timestamp with time zone,
    "silo_restore_tier" "text" DEFAULT 'Bulk'::"text",
    "silo_restored_at" timestamp with time zone,
    "silo_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "deliveries_silo_status_check" CHECK (("silo_status" = ANY (ARRAY['archived'::"text", 'restoring'::"text", 'restored'::"text"]))),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'in_review'::"text", 'approved'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."deliveries" OWNER TO "postgres";


COMMENT ON COLUMN "public"."deliveries"."appearance" IS 'Customizable gallery appearance settings (card size, aspect ratio/masonry, thumbnail scaling, info display, watermarking)';



COMMENT ON COLUMN "public"."deliveries"."silo_status" IS 'Cold storage status in AWS S3 Glacier Deep Archive (archived, restoring, restored)';



COMMENT ON COLUMN "public"."deliveries"."silo_archived_at" IS 'Timestamp when delivery master assets were archived to AWS S3 Glacier Deep Archive';



COMMENT ON COLUMN "public"."deliveries"."silo_restore_requested_at" IS 'Timestamp when thawing was requested from S3 Glacier';



COMMENT ON COLUMN "public"."deliveries"."silo_restore_tier" IS 'Glacier retrieval tier used for restoration (Bulk or Standard)';



COMMENT ON COLUMN "public"."deliveries"."silo_restored_at" IS 'Timestamp when thawing completed and assets became ready';



COMMENT ON COLUMN "public"."deliveries"."silo_metadata" IS 'Additional archive metadata including S3 bucket, total archived bytes, and original asset paths';



CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_version_id" "uuid" NOT NULL,
    "author_user_id" "uuid",
    "author_name" "text" NOT NULL,
    "comment_text" "text" NOT NULL,
    "timestamp_seconds" numeric(10,2),
    "is_resolved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_id" "uuid" NOT NULL,
    "author_user_id" "uuid",
    "author_name" "text" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback_replies" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedback_replies" IS 'Stores conversational replies to top-level review markers and feedback notes';



COMMENT ON COLUMN "public"."feedback_replies"."feedback_id" IS 'Foreign key to parent feedback review marker';



COMMENT ON COLUMN "public"."feedback_replies"."comment_text" IS 'Body of the reply message';



CREATE TABLE IF NOT EXISTS "public"."inquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "workspace_id" "uuid",
    "portfolio_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "subject" "text",
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'unread'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "inquiries_status_check" CHECK (("status" = ANY (ARRAY['unread'::"text", 'read'::"text", 'archived'::"text"]))),
    CONSTRAINT "inquiries_type_check" CHECK (("type" = ANY (ARRAY['portfolio_lead'::"text", 'contact_message'::"text", 'partnership_lead'::"text"])))
);


ALTER TABLE "public"."inquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "stripe_invoice_id" "text",
    "stripe_customer_id" "text",
    "amount_cents" integer DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "description" "text" NOT NULL,
    "hosted_invoice_url" "text",
    "pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "delivery_id" "uuid",
    "channel" "text" DEFAULT 'whatsapp'::"text",
    "recipient_phone" "text",
    "status" "text" DEFAULT 'queued'::"text",
    "provider_message_id" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "recipient_email" "text",
    "subject" "text",
    CONSTRAINT "notification_logs_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'email'::"text"]))),
    CONSTRAINT "notification_logs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "billing_interval" "text" DEFAULT 'month'::"text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "stripe_price_id" "text",
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plans_billing_interval_check" CHECK (("billing_interval" = ANY (ARRAY['month'::"text", 'year'::"text"])))
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portfolios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "bio" "text",
    "cover_asset_url" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "is_published" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "appearance" "jsonb" DEFAULT '{"cardSize": "M", "aspectRatio": "16:9", "showClientInfo": true, "thumbnailScale": "fill"}'::"jsonb",
    "experience" "jsonb" DEFAULT '[]'::"jsonb",
    "whatsapp_number" "text",
    "stats" "jsonb" DEFAULT '{"years": "6", "location": "UAE", "projects": "80+"}'::"jsonb",
    "layout_template" "text" DEFAULT 'grid'::"text"
);


ALTER TABLE "public"."portfolios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_assets" (
    "project_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "portfolio_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "client_name" "text",
    "description" "text",
    "category" "text" DEFAULT 'Commercial'::"text",
    "cover_asset_url" "text",
    "year" "text",
    "location" "text",
    "display_order" integer DEFAULT 0,
    "is_published" boolean DEFAULT true,
    "source_delivery_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "payment_provider_sub_id" "text",
    "payment_provider_cust_id" "text",
    "status" "text" DEFAULT 'trialing'::"text" NOT NULL,
    "currency" "text" DEFAULT 'AED'::"text",
    "trial_ends_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "platform_role" "text" DEFAULT 'user'::"text" NOT NULL,
    "last_login_at" timestamp with time zone,
    "last_login_ip" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_profiles_platform_role_check" CHECK (("platform_role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "status" character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    "referral_code" character varying(32) NOT NULL,
    "referred_by_id" "uuid",
    "referral_count" integer DEFAULT 0 NOT NULL,
    "priority_score" integer DEFAULT 0 NOT NULL,
    "invite_token" character varying(64),
    "invited_at" timestamp with time zone,
    "joined_at" timestamp with time zone,
    "role" character varying(64),
    "company_size" character varying(32),
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."waitlist_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_features" (
    "workspace_id" "uuid" NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workspace_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'editor'::"text" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text") NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workspace_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text"]))),
    CONSTRAINT "workspace_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."workspace_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'editor'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workspace_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_settings" (
    "workspace_id" "uuid" NOT NULL,
    "notify_approvals" boolean DEFAULT true NOT NULL,
    "notify_comments" boolean DEFAULT true NOT NULL,
    "notify_downloads" boolean DEFAULT true NOT NULL,
    "weekly_digest" boolean DEFAULT false NOT NULL,
    "whatsapp_number" "text",
    "whatsapp_enabled" boolean DEFAULT true NOT NULL,
    "default_link_expiration_days" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "brand_name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "logo_url" "text",
    "custom_domain" "text",
    "accent_color" "text" DEFAULT '''#f5551d''::text'::"text",
    "default_language" "text" DEFAULT 'ar'::"text",
    "account_type" "text" DEFAULT 'individual'::"text" NOT NULL,
    "storage_used_bytes" bigint DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workspaces_account_type_check" CHECK (("account_type" = ANY (ARRAY['individual'::"text", 'studio'::"text"]))),
    CONSTRAINT "workspaces_default_language_check" CHECK (("default_language" = ANY (ARRAY['ar'::"text", 'en'::"text"])))
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."asset_versions"
    ADD CONSTRAINT "asset_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_replies"
    ADD CONSTRAINT "feedback_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."portfolios"
    ADD CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolios"
    ADD CONSTRAINT "portfolios_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."portfolios"
    ADD CONSTRAINT "portfolios_workspace_id_key" UNIQUE ("workspace_id");



ALTER TABLE ONLY "public"."project_assets"
    ADD CONSTRAINT "project_assets_pkey" PRIMARY KEY ("project_id", "asset_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "projects_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_workspace_id_key" UNIQUE ("workspace_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."workspace_features"
    ADD CONSTRAINT "workspace_features_pkey" PRIMARY KEY ("workspace_id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspace_settings"
    ADD CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("workspace_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_custom_domain_key" UNIQUE ("custom_domain");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_slug_key" UNIQUE ("slug");



CREATE INDEX "idx_asset_versions_asset_id" ON "public"."asset_versions" USING "btree" ("asset_id");

CREATE INDEX "idx_asset_versions_active" ON "public"."asset_versions" USING "btree" ("asset_id") WHERE ("is_active_version" = true);



CREATE INDEX "idx_assets_project_id" ON "public"."assets" USING "btree" ("delivery_id");

CREATE INDEX "idx_assets_delivery_active_sort" ON "public"."assets" USING "btree" ("delivery_id", "is_archived", "sort_order");



CREATE INDEX "idx_assets_workspace_id" ON "public"."assets" USING "btree" ("workspace_id");



CREATE INDEX "idx_assets_workspace_unassigned" ON "public"."assets" USING "btree" ("workspace_id") WHERE ("delivery_id" IS NULL);



CREATE INDEX "idx_deliveries_share_token" ON "public"."deliveries" USING "btree" ("share_token");



CREATE INDEX "idx_deliveries_workspace_id" ON "public"."deliveries" USING "btree" ("workspace_id");



CREATE INDEX "idx_feedback_asset_version_id" ON "public"."feedback" USING "btree" ("asset_version_id");



CREATE INDEX "idx_feedback_replies_feedback_created" ON "public"."feedback_replies" USING "btree" ("feedback_id", "created_at");



CREATE INDEX "idx_feedback_timestamp" ON "public"."feedback" USING "btree" ("timestamp_seconds");



CREATE INDEX "idx_inquiries_created_at" ON "public"."inquiries" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_inquiries_type" ON "public"."inquiries" USING "btree" ("type");



CREATE INDEX "idx_inquiries_workspace_id" ON "public"."inquiries" USING "btree" ("workspace_id");



CREATE INDEX "idx_invitations_email" ON "public"."workspace_invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_token" ON "public"."workspace_invitations" USING "btree" ("token");



CREATE INDEX "idx_invoices_stripe_invoice_id" ON "public"."invoices" USING "btree" ("stripe_invoice_id");



CREATE INDEX "idx_invoices_workspace_id" ON "public"."invoices" USING "btree" ("workspace_id");



CREATE INDEX "idx_notification_logs_recipient_email" ON "public"."notification_logs" USING "btree" ("recipient_email");



CREATE INDEX "idx_plans_slug" ON "public"."plans" USING "btree" ("slug");



CREATE INDEX "idx_portfolios_slug" ON "public"."portfolios" USING "btree" ("slug");



CREATE INDEX "idx_project_assets_project_id" ON "public"."project_assets" USING "btree" ("project_id");



CREATE INDEX "idx_projects_portfolio_id" ON "public"."projects" USING "btree" ("portfolio_id");



CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_waitlist_email" ON "public"."waitlist_entries" USING "btree" ("email");



CREATE INDEX "idx_waitlist_invite_token" ON "public"."waitlist_entries" USING "btree" ("invite_token");



CREATE INDEX "idx_waitlist_ranking" ON "public"."waitlist_entries" USING "btree" ("status", "priority_score" DESC, "created_at");



CREATE INDEX "idx_waitlist_referral_code" ON "public"."waitlist_entries" USING "btree" ("referral_code");



CREATE INDEX "idx_workspace_members_user_id" ON "public"."workspace_members" USING "btree" ("user_id");



CREATE INDEX "idx_workspace_members_workspace_id" ON "public"."workspace_members" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspaces_owner_id" ON "public"."workspaces" USING "btree" ("owner_id");




CREATE OR REPLACE TRIGGER "on_subscription_plan_change" AFTER INSERT OR UPDATE OF "plan_id" ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_workspace_features"();



CREATE OR REPLACE TRIGGER "on_workspace_created" AFTER INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."create_workspace_features"();



CREATE OR REPLACE TRIGGER "on_workspace_created_settings" AFTER INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."create_workspace_settings"();



CREATE OR REPLACE TRIGGER "set_assets_updated_at" BEFORE UPDATE ON "public"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_feedback_replies_updated_at" BEFORE UPDATE ON "public"."feedback_replies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_feedback_updated_at" BEFORE UPDATE ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_plans_updated_at" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_portfolios_updated_at" BEFORE UPDATE ON "public"."portfolios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_projects_updated_at" BEFORE UPDATE ON "public"."deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_workspace_features_updated_at" BEFORE UPDATE ON "public"."workspace_features" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_workspace_invitations_updated_at" BEFORE UPDATE ON "public"."workspace_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_workspace_settings_updated_at" BEFORE UPDATE ON "public"."workspace_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_workspaces_updated_at" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_prevent_role_escalation" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_escalation"();



ALTER TABLE ONLY "public"."asset_versions"
    ADD CONSTRAINT "asset_versions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_asset_version_id_fkey" FOREIGN KEY ("asset_version_id") REFERENCES "public"."asset_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_replies"
    ADD CONSTRAINT "feedback_replies_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_replies"
    ADD CONSTRAINT "feedback_replies_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_project_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolios"
    ADD CONSTRAINT "portfolios_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_assets"
    ADD CONSTRAINT "project_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_assets"
    ADD CONSTRAINT "project_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_source_delivery_id_fkey" FOREIGN KEY ("source_delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_workspace_id_fkey1" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waitlist_entries"
    ADD CONSTRAINT "waitlist_entries_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "public"."waitlist_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_features"
    ADD CONSTRAINT "workspace_features_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_settings"
    ADD CONSTRAINT "workspace_settings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and owners can update workspaces" ON "public"."workspaces" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "owner_id") OR "public"."is_workspace_admin"("id", "auth"."uid"()))) WITH CHECK ((("auth"."uid"() = "owner_id") OR "public"."is_workspace_admin"("id", "auth"."uid"())));



CREATE POLICY "Admins can manage all profiles" ON "public"."user_profiles" USING ("public"."is_platform_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage invitations" ON "public"."workspace_invitations" USING ("public"."is_workspace_admin"("workspace_id", "auth"."uid"()));



CREATE POLICY "Admins can manage plans" ON "public"."plans" USING ("public"."is_platform_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage workspace features" ON "public"."workspace_features" USING (("public"."is_platform_admin"("auth"."uid"()) OR "public"."is_workspace_admin"("workspace_id", "auth"."uid"())));



CREATE POLICY "Allow public insert to inquiries" ON "public"."inquiries" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert to waitlist" ON "public"."waitlist_entries" FOR INSERT WITH CHECK (((("status")::"text" = 'pending'::"text") AND ("priority_score" = 0) AND ("invite_token" IS NULL)));



CREATE POLICY "Anyone can read active plans" ON "public"."plans" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone with share_token can view project" ON "public"."deliveries" FOR SELECT USING (("share_token" IS NOT NULL));



CREATE POLICY "Authenticated users can create workspaces" ON "public"."workspaces" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Members can read workspace features" ON "public"."workspace_features" FOR SELECT USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Members can view membership" ON "public"."workspace_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_workspace_member"("workspace_id", "auth"."uid"())));



CREATE POLICY "Members can view workspaces" ON "public"."workspaces" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "owner_id") OR "public"."is_workspace_member"("id", "auth"."uid"())));



CREATE POLICY "Only owners can delete workspaces" ON "public"."workspaces" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Owner and admins can manage members" ON "public"."workspace_members" USING ("public"."is_workspace_admin"("workspace_id", "auth"."uid"()));



CREATE POLICY "Platform admins can manage invoices" ON "public"."invoices" TO "authenticated" USING ("public"."is_platform_admin"("auth"."uid"())) WITH CHECK ("public"."is_platform_admin"("auth"."uid"()));



CREATE POLICY "Platform admins can manage subscriptions" ON "public"."subscriptions" TO "authenticated" USING ("public"."is_platform_admin"("auth"."uid"())) WITH CHECK ("public"."is_platform_admin"("auth"."uid"()));



CREATE POLICY "Platform admins can view waitlist entries" ON "public"."waitlist_entries" FOR SELECT TO "authenticated" USING ("public"."is_platform_admin"("auth"."uid"()));



CREATE POLICY "Public can view published portfolios" ON "public"."portfolios" FOR SELECT USING ((("is_published" = true) OR (("auth"."uid"() IS NOT NULL) AND ("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Service role full access on inquiries" ON "public"."inquiries" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can read own profile" ON "public"."user_profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."is_platform_admin"("auth"."uid"())));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can view pending invitations sent to their email" ON "public"."workspace_invitations" FOR SELECT TO "authenticated" USING ((("email" = ("auth"."jwt"() ->> 'email'::"text")) AND ("status" = 'pending'::"text") AND ("expires_at" > "now"())));



CREATE POLICY "Workspace admins can delete clients" ON "public"."clients" FOR DELETE TO "authenticated" USING ("public"."is_workspace_admin"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members and owners can manage clients" ON "public"."clients" TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "clients"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "clients"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace members and owners can view clients" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."is_workspace_member"("workspace_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "clients"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace members can create clients" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can manage asset versions" ON "public"."asset_versions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."assets" "a"
  WHERE (("a"."id" = "asset_versions"."asset_id") AND "public"."is_workspace_member"("a"."workspace_id", "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assets" "a"
  WHERE (("a"."id" = "asset_versions"."asset_id") AND "public"."is_workspace_member"("a"."workspace_id", "auth"."uid"())))));



CREATE POLICY "Workspace members can manage assets" ON "public"."assets" TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"())) WITH CHECK ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can manage deliveries" ON "public"."deliveries" TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"())) WITH CHECK ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can manage feedback" ON "public"."feedback" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."asset_versions" "v"
     JOIN "public"."assets" "a" ON (("a"."id" = "v"."asset_id")))
  WHERE (("v"."id" = "feedback"."asset_version_id") AND "public"."is_workspace_member"("a"."workspace_id", "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."asset_versions" "v"
     JOIN "public"."assets" "a" ON (("a"."id" = "v"."asset_id")))
  WHERE (("v"."id" = "feedback"."asset_version_id") AND "public"."is_workspace_member"("a"."workspace_id", "auth"."uid"())))));



CREATE POLICY "Workspace members can manage feedback replies" ON "public"."feedback_replies" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."feedback" "f"
     JOIN "public"."asset_versions" "v" ON (("v"."id" = "f"."asset_version_id")))
     JOIN "public"."assets" "a" ON (("a"."id" = "v"."asset_id")))
  WHERE (("f"."id" = "feedback_replies"."feedback_id") AND "public"."is_workspace_member"("a"."workspace_id", "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."feedback" "f"
     JOIN "public"."asset_versions" "v" ON (("v"."id" = "f"."asset_version_id")))
     JOIN "public"."assets" "a" ON (("a"."id" = "v"."asset_id")))
  WHERE (("f"."id" = "feedback_replies"."feedback_id") AND "public"."is_workspace_member"("a"."workspace_id", "auth"."uid"())))));



CREATE POLICY "Workspace members can manage projects" ON "public"."deliveries" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can manage projects" ON "public"."projects" TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"())) WITH CHECK ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can record notification logs" ON "public"."notification_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can update clients" ON "public"."clients" FOR UPDATE TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"())) WITH CHECK ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can update notification logs" ON "public"."notification_logs" FOR UPDATE TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"())) WITH CHECK ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can view clients" ON "public"."clients" FOR SELECT TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can view invoices" ON "public"."invoices" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "invoices"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "invoices"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"())))) OR "public"."is_platform_admin"("auth"."uid"())));



CREATE POLICY "Workspace members can view notification logs" ON "public"."notification_logs" FOR SELECT TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can view settings" ON "public"."workspace_settings" FOR SELECT TO "authenticated" USING ("public"."is_workspace_member"("workspace_id", "auth"."uid"()));



CREATE POLICY "Workspace members can view subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "subscriptions"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "subscriptions"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"())))) OR "public"."is_platform_admin"("auth"."uid"())));



CREATE POLICY "Workspace members can view workspace inquiries" ON "public"."inquiries" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR (("workspace_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "inquiries"."workspace_id") AND ("wm"."user_id" = "auth"."uid"()))))) OR (("workspace_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "inquiries"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "Workspace owners and admins can insert settings" ON "public"."workspace_settings" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "workspace_settings"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "workspace_settings"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace owners and admins can update settings" ON "public"."workspace_settings" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "workspace_settings"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "workspace_settings"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "workspace_settings"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces"
  WHERE (("workspaces"."id" = "workspace_settings"."workspace_id") AND ("workspaces"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace owners and members can manage portfolios" ON "public"."portfolios" TO "authenticated" USING (("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"())
UNION
 SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"())))) WITH CHECK (("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"())
UNION
 SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."asset_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portfolios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."create_workspace_features"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_workspace_features"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workspace_features"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_workspace_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_workspace_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workspace_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_waitlist_position"("p_entry_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_waitlist_position"("p_entry_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_waitlist_position"("p_entry_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_platform_admin"("u_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_platform_admin"("u_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"("u_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_admin"("ws_id" "uuid", "u_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("ws_id" "uuid", "u_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("ws_id" "uuid", "u_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_member"("ws_id" "uuid", "u_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("ws_id" "uuid", "u_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("ws_id" "uuid", "u_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_workspace_features"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_workspace_features"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_workspace_features"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."asset_versions" TO "anon";
GRANT ALL ON TABLE "public"."asset_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_versions" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."deliveries" TO "anon";
GRANT ALL ON TABLE "public"."deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_replies" TO "anon";
GRANT ALL ON TABLE "public"."feedback_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_replies" TO "service_role";



GRANT ALL ON TABLE "public"."inquiries" TO "anon";
GRANT ALL ON TABLE "public"."inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."inquiries" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."invoices" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."notification_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."portfolios" TO "anon";
GRANT ALL ON TABLE "public"."portfolios" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolios" TO "service_role";



GRANT ALL ON TABLE "public"."project_assets" TO "anon";
GRANT ALL ON TABLE "public"."project_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."project_assets" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist_entries" TO "anon";
GRANT ALL ON TABLE "public"."waitlist_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist_entries" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_features" TO "anon";
GRANT ALL ON TABLE "public"."workspace_features" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_features" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_invitations" TO "anon";
GRANT ALL ON TABLE "public"."workspace_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_settings" TO "anon";
GRANT ALL ON TABLE "public"."workspace_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_settings" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- ----------------------------------------------------------------------------
-- Signup provisioning (auth schema; not part of a public-schema dump).
-- Creates the profile, personal workspace, membership and subscription rows.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
