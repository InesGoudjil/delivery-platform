"use client";

import { useEffect, useRef } from "react";
import posthog, { type PostHog as PostHogClient } from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";
import { env } from "@/lib/env";

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

function ensureInitialized(): PostHogClient | null {
  if (typeof window === "undefined") return null;
  if (!env.isPostHogClientEnabled) return null;
  if (initialized) return posthog;
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
    ui_host: env.NEXT_PUBLIC_POSTHOG_UI_HOST || "https://eu.posthog.com",
    capture_pageview: true,
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

export interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const touched = useRef(false);

  useEffect(() => {
    if (touched.current) return;
    touched.current = true;
    ensureInitialized();
  }, []);

  if (!env.isPostHogClientEnabled || !env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>;
}
