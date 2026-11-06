-- Migration: 20261106000002_drop_comment_permission_from_projects.sql
-- Description: Clean up accidentally added is_comment_allowed column from portfolio projects table

ALTER TABLE "public"."projects"
DROP COLUMN IF EXISTS "is_comment_allowed";
