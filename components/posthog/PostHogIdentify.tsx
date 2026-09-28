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

    const apply = async (userId: string | null) => {
      if (!mounted) return;
      if (!userId) {
        client.reset();
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user || user.id !== userId) {
        client.reset();
        return;
      }

      const properties: Record<string, unknown> = {
        email: user.email,
        name:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          undefined,
      };

      // Try to load the user's first workspace to attach a group.
      try {
        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("id, slug, brand_name, account_type")
          .eq("owner_id", user.id)
          .limit(1);
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

    // Initial sync.
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session?.user?.id ?? null);
    });

    // Listen for future changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
