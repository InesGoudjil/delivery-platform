-- Migration: Update notification_logs table for email notifications
-- Allows recipient_phone to be null for email channel notifications
-- Adds recipient_email and subject columns

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notification_logs' 
    AND column_name = 'recipient_phone'
  ) THEN
    ALTER TABLE notification_logs ALTER COLUMN recipient_phone DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE notification_logs 
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- Index for searching notification logs by recipient email
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_email 
  ON notification_logs (recipient_email);
