-- =============================================================================
-- Performance Optimization: Missing RLS & Hot-Query Indexes + Duplicate Cleanup
-- =============================================================================

-- 1. Critical missing index for RLS policies (`workspaces.owner_id = auth.uid()`)
--    and `findByOwnerId` / `listByOwnerId` queries
CREATE INDEX IF NOT EXISTS "idx_workspaces_owner_id"
  ON "public"."workspaces" USING "btree" ("owner_id");

-- 2. Partial index for Edge Middleware session revocation checks on every request
CREATE INDEX IF NOT EXISTS "idx_user_sessions_token_id"
  ON "public"."user_sessions" USING "btree" ("session_token_id")
  WHERE ("is_revoked" = false);

-- 3. Partial index for active asset version lookups (`findActiveByAssetId` / `listActiveByAssetIds`)
CREATE INDEX IF NOT EXISTS "idx_asset_versions_active"
  ON "public"."asset_versions" USING "btree" ("asset_id")
  WHERE ("is_active_version" = true);

-- 4. Composite index for delivery asset listing sorted by `sort_order`
CREATE INDEX IF NOT EXISTS "idx_assets_delivery_active_sort"
  ON "public"."assets" USING "btree" ("delivery_id", "is_archived", "sort_order");

-- 5. Drop redundant duplicate indexes
DROP INDEX IF EXISTS "public"."idx_projects_share_token";
DROP INDEX IF EXISTS "public"."idx_projects_workspace_id";
DROP INDEX IF EXISTS "public"."idx_feedback_replies_feedback_id";
