-- Comments from client-room guests carry a hash of a random key held in an httpOnly cookie
-- in the guest's browser (lib/security/delivery-token.ts). The server lets a guest edit,
-- resolve or delete a comment only from the browser that wrote it. Before, anyone with
-- the link (or any signed-in user) could edit or delete any comment by its id.
--
-- Guest comments are written by the server with the service role. API users can't set
-- or change the hash: signed-in members still post only as themselves
-- (author_user_id = auth.uid(), 20261111120000). Safe to re-run.

ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS guest_author_key_hash text;
ALTER TABLE public.feedback_replies ADD COLUMN IF NOT EXISTS guest_author_key_hash text;

COMMENT ON COLUMN public.feedback.guest_author_key_hash IS
  'SHA-256 of the guest author key cookie of the client-room browser that wrote this comment. Server-written; null for members.';
COMMENT ON COLUMN public.feedback_replies.guest_author_key_hash IS
  'SHA-256 of the guest author key cookie of the client-room browser that wrote this reply. Server-written; null for members.';

-- Members post as themselves, never as a guest.
DROP POLICY IF EXISTS "Members can post feedback" ON public.feedback;
CREATE POLICY "Members can post feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND guest_author_key_hash IS NULL
    AND EXISTS (
      SELECT 1 FROM public.asset_versions v JOIN public.assets a ON a.id = v.asset_id
      WHERE v.id = feedback.asset_version_id AND public.has_workspace_role(a.workspace_id, 'viewer')
    )
  );

DROP POLICY IF EXISTS "Members can post feedback replies" ON public.feedback_replies;
CREATE POLICY "Members can post feedback replies" ON public.feedback_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND guest_author_key_hash IS NULL
    AND EXISTS (
      SELECT 1 FROM public.feedback f
      JOIN public.asset_versions v ON v.id = f.asset_version_id
      JOIN public.assets a ON a.id = v.asset_id
      WHERE f.id = feedback_replies.feedback_id AND public.has_workspace_role(a.workspace_id, 'viewer')
    )
  );

-- Nobody moves a comment, or changes who wrote it, through the API.
DROP TRIGGER IF EXISTS trg_guard_feedback_columns ON public.feedback;
CREATE TRIGGER trg_guard_feedback_columns
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('asset_version_id', 'author_user_id', 'guest_author_key_hash');

DROP TRIGGER IF EXISTS trg_guard_feedback_reply_columns ON public.feedback_replies;
CREATE TRIGGER trg_guard_feedback_reply_columns
  BEFORE UPDATE ON public.feedback_replies
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('feedback_id', 'author_user_id', 'guest_author_key_hash');
