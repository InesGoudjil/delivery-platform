-- Migration: 20261106000001_add_comment_permission_to_deliveries.sql
-- Description: Add is_comment_allowed column to deliveries table for client review room permissions

ALTER TABLE "public"."deliveries"
ADD COLUMN IF NOT EXISTS "is_comment_allowed" boolean DEFAULT true NOT NULL;

COMMENT ON COLUMN "public"."deliveries"."is_comment_allowed" IS
'Controls whether client guests and reviewers can post timecoded comments and replies on this delivery cut.';
