"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostHog } from "posthog-js";
import { withPostHog } from "@/lib/posthog/client";

/**
 * Bridges Supabase auth state → PostHog identify/reset/group.
 *
 * On sign-in: `posthog.identify(user.id, { email, name, workspaceId, ... })`
 *            `posthog.group('workspace', workspaceId, { ... })`
 * On sign-out: `posthog.reset()`
 *
 * Most visitors aren't signed in, so the Supabase client (~60 KB) is only loaded when the
 * browser holds a Supabase auth cookie, and only once PostHog has started. Signing in or out
 * goes through the server and a navigation, so the check runs again on every route change.
 */

/** Supabase's auth cookie: `sb-<project>-auth-token`, split into `.0`, `.1`… when large. */
const AUTH_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

/** The user PostHog was last identified as in this tab, so a route change doesn't redo it. */
let identifiedAs: string | null = null;
let supabasePromise: Promise<SupabaseClient> | null = null;

function loadSupabase(client: PostHog): Promise<SupabaseClient> {
  supabasePromise ??= import("@/lib/supabase/client").then(({ createClient }) => {
    const supabase = createClient();
    // Sign-ins and sign-outs made by the browser client itself.
    supabase.auth.onAuthStateChange((_event, session) => {
      void sync(client, supabase, session?.user?.id ?? null);
    });
    return supabase;
  });
  return supabasePromise;
}

function forget(client: PostHog) {
  // Only after an identified user: resetting an anonymous visitor would give them a new id.
  if (identifiedAs !== null || client.get_property("$user_state") === "identified") client.reset();
  identifiedAs = null;
}

async function sync(client: PostHog, supabase: SupabaseClient, userId: string | null) {
  if (!userId) return forget(client);
  if (userId === identifiedAs) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return forget(client);

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
  identifiedAs = userId;
}

export function PostHogIdentify() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    withPostHog((client) => {
      if (cancelled) return;
      if (!AUTH_COOKIE.test(document.cookie)) {
        forget(client);
        return;
      }
      void loadSupabase(client).then(async (supabase) => {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        await sync(client, supabase, data.session?.user?.id ?? null);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
