-- Migration: 20261103000000_entitlements_ssot_cleanup.sql
-- Description: Deprecate full snapshot copy in workspace_features and establish plans + subscriptions as SSOT

-- 1. Drop legacy auto-sync triggers that copied plan features into workspace_features
DROP TRIGGER IF EXISTS "on_subscription_plan_change" ON "public"."subscriptions";
DROP TRIGGER IF EXISTS "on_workspace_created" ON "public"."workspaces";
DROP FUNCTION IF EXISTS "public"."sync_workspace_features"();
DROP FUNCTION IF EXISTS "public"."create_workspace_features"();

-- 2. Clean out redundant snapshot copies from workspace_features
-- Clear out rows that are exact duplicates of their plan features, leaving only intentional overrides
UPDATE "public"."workspace_features" wf
SET "features" = '{}'::jsonb
FROM "public"."subscriptions" s
JOIN "public"."plans" p ON p.id = s.plan_id
WHERE s.workspace_id = wf.workspace_id
  AND wf.features = p.features;

-- 3. Document table role explicitly
COMMENT ON TABLE "public"."workspace_features" IS 
'Stores optional custom feature overrides per workspace. Base plan features derive dynamically from subscriptions -> plans.';

-- 4. Add index to optimize subscription + plan resolution queries
CREATE INDEX IF NOT EXISTS "idx_subscriptions_workspace_status" 
ON "public"."subscriptions"("workspace_id", "status");

CREATE INDEX IF NOT EXISTS "idx_plans_slug_active" 
ON "public"."plans"("slug", "is_active");
