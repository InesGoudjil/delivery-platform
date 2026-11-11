-- Migration: Add AWS S3 Glacier Deep Archive (The Silo) tracking columns to deliveries and asset_versions

-- 1. Deliveries table: add Silo archival & restore tracking
ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS silo_status text CHECK (silo_status IN ('archived', 'restoring', 'restored')),
ADD COLUMN IF NOT EXISTS silo_archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS silo_restore_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS silo_restore_tier text DEFAULT 'Bulk',
ADD COLUMN IF NOT EXISTS silo_restored_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS silo_metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Asset versions table: record S3 Glacier object key and storage tier
ALTER TABLE public.asset_versions
ADD COLUMN IF NOT EXISTS silo_archive_key text,
ADD COLUMN IF NOT EXISTS silo_storage_class text DEFAULT 'DEEP_ARCHIVE';

-- Comments for documentation
COMMENT ON COLUMN public.deliveries.silo_status IS 'Cold storage status in AWS S3 Glacier Deep Archive (archived, restoring, restored)';
COMMENT ON COLUMN public.deliveries.silo_archived_at IS 'Timestamp when delivery master assets were archived to AWS S3 Glacier Deep Archive';
COMMENT ON COLUMN public.deliveries.silo_restore_requested_at IS 'Timestamp when thawing was requested from S3 Glacier';
COMMENT ON COLUMN public.deliveries.silo_restore_tier IS 'Glacier retrieval tier used for restoration (Bulk or Standard)';
COMMENT ON COLUMN public.deliveries.silo_restored_at IS 'Timestamp when thawing completed and assets became ready';
COMMENT ON COLUMN public.deliveries.silo_metadata IS 'Additional archive metadata including S3 bucket, total archived bytes, and original asset paths';
COMMENT ON COLUMN public.asset_versions.silo_archive_key IS 'AWS S3 object key in Glacier Deep Archive bucket';
COMMENT ON COLUMN public.asset_versions.silo_storage_class IS 'S3 Storage class (DEEP_ARCHIVE or GLACIER)';
