-- Migration: 20261106000000_add_comment_permission_to_projects.sql
-- Description: Add is_comment_allowed column to projects table to support delivery review permissions

ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "is_comment_allowed" boolean DEFAULT true NOT NULL;

COMMENT ON COLUMN "public"."projects"."is_comment_allowed" IS
'Controls whether client guests and reviewers can post timecoded comments and replies on this delivery.';
