-- Indexes from the production baseline (20261101000002) that some environments, such as
-- staging, never got: their schema came from the archived migrations, and these were added
-- to production by hand. No effect where they already exist. Safe to re-run.

CREATE INDEX IF NOT EXISTS "idx_asset_versions_active"
  ON "public"."asset_versions" USING btree ("asset_id") WHERE ("is_active_version" = true);

CREATE INDEX IF NOT EXISTS "idx_assets_delivery_active_sort"
  ON "public"."assets" USING btree ("delivery_id", "is_archived", "sort_order");

CREATE INDEX IF NOT EXISTS "idx_workspaces_owner_id"
  ON "public"."workspaces" USING btree ("owner_id");
