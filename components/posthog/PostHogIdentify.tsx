"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPostHogClient } from "@/lib/posthog/client";

/**
 * Bridges Supabase auth state → PostHog identify/reset/group.
 *
 * On sign-in: `posthog.identify(user.id, { email, name, workspaceId, ... })`
 *            `posthog.group('workspace', workspaceId, { ... })`
 * On sign-out: `posthog.reset()`
 *
 * The workspace context is loaded from the user's first workspace
 * via the Supabase `user_workspaces` view (a PostgREST function that
 * returns a flat array of the user's workspaces).
 */
export function PostHogIdentify() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const client = getPostHogClient();
    if (!client) return;
    const supabase = createClient();

    let mounted = true;
    let lastIdentifiedUserId: string | null | undefined = undefined;

    const apply = async (sessionUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    } | null) => {
      if (!mounted) return;
      const userId = sessionUser?.id ?? null;

      if (userId === lastIdentifiedUserId) return;
      lastIdentifiedUserId = userId;

      if (!sessionUser || !userId) {
        client.reset();
        return;
      }

      const properties: Record<string, unknown> = {
        email: sessionUser.email,
        name:
          (sessionUser.user_metadata?.full_name as string | undefined) ||
          (sessionUser.user_metadata?.name as string | undefined) ||
          undefined,
      };

      // Try to load the user's first workspace to attach a group.
      try {
        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("id, slug, brand_name, account_type")
          .eq("owner_id", userId)
          .limit(1);
        if (!mounted) return;
        const ws = workspaces?.[0];
        if (ws) {
          properties.workspace_id = ws.id;
          properties.workspace_slug = ws.slug;
          client.group("workspace", ws.id, {
            name: ws.brand_name,
            slug: ws.slug,
            account_type: ws.account_type,
          });
        }
      } catch (err) {
        // Non-fatal; analytics shouldn't break the app.
        console.warn("[posthog] could not load workspace for group", err);
      }

      client.identify(userId, properties);
    };

    // `onAuthStateChange` fires `INITIAL_SESSION` immediately on subscription
    // and provides `session.user` directly without an extra `auth.getUser()` HTTP roundtrip.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      apply((session?.user as any) ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
