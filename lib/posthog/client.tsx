"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { PostHog as PostHogClient } from "posthog-js";
import { isOnPrivatePage, isPrivateAnalyticsUrl } from "@/lib/analytics/private-paths";

/**
 * Browser-side PostHog.
 *
 * The SDK (~120 KB compressed) isn't in the page's bundle: it's imported once the page has loaded
 * and the browser is idle, so it never competes with the first paint or hydration. Calls made
 * before then (the first pageview, identify) wait for it through `withPostHog`.
 *
 * Nothing is captured on private pages (client rooms, invitations, sign-in): the SDK isn't
 * started there, every event sent from one is dropped, and session replay is paused while one
 * is open (see PostHogPageView).
 */

/*
 * Settings are read as literal `process.env.NEXT_PUBLIC_…` expressions: Next inlines only those
 * into browser code. (`env` from lib/env spreads process.env, which is empty in the browser, so
 * it never saw the key there; it also pulls zod into every page.)
 *
 * Browser analytics are off unless NEXT_PUBLIC_POSTHOG_ENABLED is "true", and session replay
 * also needs NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED="true". Server-side PostHog
 * (lib/posthog/server) is configured separately.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const enabled =
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true" && Boolean(KEY) && KEY !== "your-posthog-project-key";
const replayEnabled = process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED === "true";

/** The started client, once there is one. */
let client: PostHogClient | null = null;
let starting: Promise<PostHogClient> | null = null;
let resolveStarted: (client: PostHogClient) => void = () => {};
/** Settles when the SDK has started; never, on a visit that only sees private pages. */
const started = new Promise<PostHogClient>((resolve) => {
  resolveStarted = resolve;
});

function start(): Promise<PostHogClient> {
  starting ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      before_send: (event) => (event && isPrivateAnalyticsUrl(event.properties?.$current_url) ? null : event),
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || "https://eu.posthog.com",
      // PostHogPageView captures every pageview, including the first, and skips private pages.
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      // Don't create person profiles for anonymous visitors — saves quota.
      person_profiles: "identified_only",
      // Session replay with input masking on by default.
      session_recording: replayEnabled ? { maskAllInputs: true } : undefined,
      // The reverse proxy adds a tiny latency cost; longer is fine.
      request_batching: true,
      disable_compression: false,
    });
    client = posthog;
    resolveStarted(posthog);
    return posthog;
  });
  return starting;
}

/** Starts the SDK when the browser is next idle, unless this is a private page. Safe to call often. */
function startWhenIdle(): void {
  if (typeof window === "undefined" || !enabled || starting || isOnPrivatePage()) return;
  const go = () => {
    // The visitor may have moved to a private page meanwhile.
    if (!isOnPrivatePage()) void start();
  };
  const whenIdle = () =>
    "requestIdleCallback" in window ? window.requestIdleCallback(go, { timeout: 3000 }) : setTimeout(go, 1000);
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}

/**
 * Runs `fn` with the client once PostHog has started. Use it instead of `getPostHogClient()`
 * for anything that happens around page load, so the call isn't lost while the SDK is loading.
 */
export function withPostHog(fn: (client: PostHogClient) => void): void {
  if (!enabled) return;
  if (client) fn(client);
  else void started.then(fn);
}

/** The client if PostHog has started already, otherwise null (it's loaded when the page is idle). */
export function getPostHogClient(): PostHogClient | null {
  return client;
}

let replayPausedOnPrivatePage = false;

/** Stop session replay while a private page is open (resumed when the visitor leaves it). */
export function pauseReplayOnPrivatePage(): void {
  if (!client) return;
  if (client.sessionRecordingStarted()) {
    client.stopSessionRecording();
    replayPausedOnPrivatePage = true;
  }
}

/** Restart session replay if it was paused for a private page. */
export function resumeReplayAfterPrivatePage(): void {
  if (!client || !replayPausedOnPrivatePage) return;
  replayPausedOnPrivatePage = false;
  client.startSessionRecording();
}

export interface PostHogProviderProps {
  children: React.ReactNode;
}

/**
 * Starts PostHog on the first public page, once it's idle. Nothing here uses PostHog's React
 * helpers, so there's no React provider to load with the page.
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    startWhenIdle();
  }, [pathname]);

  return <>{children}</>;
}
