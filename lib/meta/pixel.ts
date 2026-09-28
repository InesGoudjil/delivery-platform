"use client";

/**
 * Browser-side Meta Pixel helpers.
 *
 * - All functions are no-ops unless `NEXT_PUBLIC_META_PIXEL_ID` is configured
 *   and we're not in development (unless `NEXT_PUBLIC_META_DEV_PIXEL=true`).
 * - This module is `"use client"` because it touches `window.fbq`; it is
 *   safe to import from server components because every export is guarded
 *   by `typeof window` checks. The `next/script` tag injected by
 *   `MetaPixel` defines `window.fbq` lazily, so the very first call after
 *   page load will find it.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[][];
      loaded?: boolean;
      version?: string;
    };
    _fbq?: Window["fbq"];
  }
}

type FbqCommand = "init" | "track" | "trackCustom" | "trackPageView";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const ALLOW_IN_DEV = process.env.NEXT_PUBLIC_META_DEV_PIXEL === "true";

export function isPixelEnabled(): boolean {
  if (!PIXEL_ID) return false;
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development" && !ALLOW_IN_DEV) return false;
  return true;
}

function call(command: FbqCommand, ...args: unknown[]): void {
  if (!isPixelEnabled()) return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  try {
    fbq(command, ...args);
  } catch (err) {
    // Never let a pixel failure break the user flow.
    console.warn("[meta-pixel] call failed", err);
  }
}

/**
 * Fire a PageView. Idempotent across re-renders — Meta dedupes the
 * initial PageView with the one in the bootstrap script.
 */
export function pageview(): void {
  call("track", "PageView");
}

/**
 * Fire a standard event. Use the typed helpers below when one fits.
 */
export function event(
  name: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  if (eventId) {
    call("track", name, params, { eventID: eventId });
  } else {
    call("track", name, params);
  }
}

/**
 * Fire a custom event (not in the Meta standard event catalog).
 */
export function eventCustom(
  name: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  if (eventId) {
    call("trackCustom", name, params, { eventID: eventId });
  } else {
    call("trackCustom", name, params);
  }
}

export interface LeadParams {
  email?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  eventId?: string;
}

export function trackLead(params: LeadParams): void {
  event(
    "Lead",
    {
      content_name: params.contentName ?? "waitlist",
      value: params.value,
      currency: params.currency,
    },
    params.eventId
  );
}

export interface CompleteRegistrationParams {
  email?: string;
  status?: string;
  eventId?: string;
}

export function trackCompleteRegistration(
  params: CompleteRegistrationParams
): void {
  event(
    "CompleteRegistration",
    {
      content_name: "signup",
      status: params.status,
    },
    params.eventId
  );
}

export interface InitiateCheckoutParams {
  planId?: string;
  planName?: string;
  value?: number;
  currency?: string;
  eventId?: string;
}

export function trackInitiateCheckout(params: InitiateCheckoutParams): void {
  event(
    "InitiateCheckout",
    {
      content_ids: params.planId ? [params.planId] : undefined,
      content_name: params.planName,
      content_type: "subscription",
      value: params.value,
      currency: params.currency,
      num_items: 1,
    },
    params.eventId
  );
}
