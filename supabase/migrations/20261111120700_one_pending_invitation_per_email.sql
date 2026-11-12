-- One pending invitation per workspace and email.
--
-- The app checks for an existing pending invitation before creating one, but two requests
-- at the same time could both pass the check. Older duplicates are revoked first (the
-- newest pending one is kept), then a unique index makes the rule hold. Safe to re-run.

UPDATE public.workspace_invitations i
SET status = 'revoked', updated_at = now()
FROM (
  SELECT id, row_number() OVER (PARTITION BY workspace_id, lower(email) ORDER BY created_at DESC, id) AS rn
  FROM public.workspace_invitations
  WHERE status = 'pending'
) ranked
WHERE i.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_pending_email
  ON public.workspace_invitations (workspace_id, lower(email))
  WHERE status = 'pending';
