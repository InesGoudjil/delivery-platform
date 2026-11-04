-- Migration: Create feedback_replies table for strict 2-level threaded feedback (Design B)
-- Date: 2026-10-16

-- 1. Create feedback_replies table
CREATE TABLE IF NOT EXISTS public.feedback_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Indexes for lookup performance and cascade deletes
CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback_id 
  ON public.feedback_replies (feedback_id);

CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback_created 
  ON public.feedback_replies (feedback_id, created_at ASC);

-- 3. Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_feedback_replies_updated_at ON public.feedback_replies;
CREATE TRIGGER set_feedback_replies_updated_at
  BEFORE UPDATE ON public.feedback_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.feedback_replies ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for feedback_replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_replies' AND policyname = 'Guests and users can view feedback replies'
  ) THEN
    CREATE POLICY "Guests and users can view feedback replies"
      ON public.feedback_replies
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_replies' AND policyname = 'Guests and users can insert feedback replies'
  ) THEN
    CREATE POLICY "Guests and users can insert feedback replies"
      ON public.feedback_replies
      FOR INSERT
      TO PUBLIC
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_replies' AND policyname = 'Guests and users can update feedback replies'
  ) THEN
    CREATE POLICY "Guests and users can update feedback replies"
      ON public.feedback_replies
      FOR UPDATE
      TO PUBLIC
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_replies' AND policyname = 'Guests and users can delete feedback replies'
  ) THEN
    CREATE POLICY "Guests and users can delete feedback replies"
      ON public.feedback_replies
      FOR DELETE
      TO PUBLIC
      USING (true);
  END IF;
END $$;

-- 6. Add UPDATE and DELETE policies for public.feedback (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Guests and users can update feedback'
  ) THEN
    CREATE POLICY "Guests and users can update feedback"
      ON public.feedback
      FOR UPDATE
      TO PUBLIC
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Guests and users can delete feedback'
  ) THEN
    CREATE POLICY "Guests and users can delete feedback"
      ON public.feedback
      FOR DELETE
      TO PUBLIC
      USING (true);
  END IF;
END $$;

-- 7. Drop obsolete parent_id foreign key constraint and column from feedback
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_parent_id_fkey;
ALTER TABLE public.feedback DROP COLUMN IF EXISTS parent_id;

-- 8. Table permissions
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE 
  ON TABLE public.feedback_replies TO "anon", "authenticated", "postgres", "service_role";

-- 9. Documentation comments
COMMENT ON TABLE public.feedback_replies IS 'Stores conversational replies to top-level review markers and feedback notes';
COMMENT ON COLUMN public.feedback_replies.feedback_id IS 'Foreign key to parent feedback review marker';
COMMENT ON COLUMN public.feedback_replies.comment_text IS 'Body of the reply message';
