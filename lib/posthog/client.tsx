"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog, { type PostHog as PostHogClient } from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";
import { env } from "@/lib/env";
import { isOnPrivatePage, isPrivateAnalyticsUrl } from "@/lib/analytics/private-paths";

/**
 * Browser-side PostHog client + React provider.
 *
 * Initialized exactly once via the singleton pattern. The provider
 * re-uses the same instance so the React helpers (useFeatureFlagEnabled,
 * etc.) work without re-initializing the SDK.
 *
 * Renders its children as a pass-through when PostHog is unconfigured
 * so dev/preview environments that don't have keys set are noise-free.
 */

let initialized = false;

/**
 * Nothing is captured on private pages (client rooms, invitations, sign-in): the SDK
 * isn't started there, every event sent from one is dropped, and session replay is
 * paused while one is open (see PostHogPageView).
 */
function ensureInitialized(): PostHogClient | null {
  if (typeof window === "undefined") return null;
  if (!env.isPostHogClientEnabled) return null;
  if (initialized) return posthog;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (isOnPrivatePage()) return null;

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    before_send: (event) => (event && isPrivateAnalyticsUrl(event.properties?.$current_url) ? null : event),
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
    ui_host: env.NEXT_PUBLIC_POSTHOG_UI_HOST || "https://eu.posthog.com",
    // PostHogPageView captures every pageview, including the first, and skips private pages.
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    // Don't create person profiles for anonymous visitors — saves quota.
    person_profiles: "identified_only",
    // Session replay with input masking on by default.
    session_recording: env.isPostHogSessionReplayEnabled
      ? { maskAllInputs: true }
      : undefined,
    // The reverse proxy adds a tiny latency cost; longer is fine.
    request_batching: true,
    // Avoid loading iframes or extra tools we don't use.
    disable_compression: false,
  });
  initialized = true;
  return posthog;
}

export function getPostHogClient(): PostHogClient | null {
  return ensureInitialized();
}

let replayPausedOnPrivatePage = false;

/** Stop session replay while a private page is open (resumed when the visitor leaves it). */
export function pauseReplayOnPrivatePage(): void {
  if (!initialized) return;
  if (posthog.sessionRecordingStarted()) {
    posthog.stopSessionRecording();
    replayPausedOnPrivatePage = true;
  }
}

/** Restart session replay if it was paused for a private page. */
export function resumeReplayAfterPrivatePage(): void {
  if (!initialized || !replayPausedOnPrivatePage) return;
  replayPausedOnPrivatePage = false;
  posthog.startSessionRecording();
}

export interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname();

  // Starts the SDK on the first public page (it's never started on a private one).
  useEffect(() => {
    ensureInitialized();
  }, [pathname]);

  if (!env.isPostHogClientEnabled || !env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>;
}
