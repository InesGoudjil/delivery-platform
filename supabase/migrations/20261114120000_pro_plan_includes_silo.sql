-- The Silo (cold archive) is part of Pro as well as Studio, as the Terms of Service (section 3)
-- and the landing page say. Entitlements come from the plan's features
-- (SubscriptionService.getEntitlements), so this turns The Silo on for Pro workspaces; the
-- SILO_ENABLED kill switch still applies. Pro's yearly plan is included in case it exists already.
UPDATE public.plans
SET features = features || '{"silo_archive": true}'::jsonb
WHERE slug IN ('pro', 'pro-yearly');
