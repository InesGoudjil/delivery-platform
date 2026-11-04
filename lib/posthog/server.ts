import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

/**
 * Server-side PostHog (posthog-node) helper.
 *
 * Used from server actions and webhooks where `window.posthog` doesn't
 * exist. All helpers are no-ops when PostHog is unconfigured or disabled,
 * matching the pattern in `lib/meta/capi.ts`.
 */

const PROJECT_API_KEY = env.POSTHOG_PROJECT_API_KEY;
const HOST = env.POSTHOG_HOST;
const ENABLED = env.isPostHogServerEnabled;

let cached: PostHog | null = null;

function getClient(): PostHog | null {
  if (!ENABLED) return null;
  if (cached) return cached;
  if (!PROJECT_API_KEY) return null;
  try {
    cached = new PostHog(PROJECT_API_KEY, {
      host: HOST,
      // Server actions and webhooks are short-lived — flush eagerly.
      flushInterval: 1000,
      // Disable GeoIP resolution server-side (the Edge/Node regions
      // don't match the user's location reliably).
      disableGeoip: false,
    });
    return cached;
  } catch (err) {
    console.warn("[posthog] failed to init server client", err);
    return null;
  }
}

export interface CaptureInput {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  groups?: Record<string, string | number>;
}

export function captureServerEvent(input: CaptureInput): void {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({
      distinctId: input.distinctId,
      event: input.event,
      properties: input.properties,
      groups: input.groups,
    });
  } catch (err) {
    console.warn("[posthog] capture failed", err);
  }
}

export interface IdentifyInput {
  distinctId: string;
  userId?: string;
  email?: string;
  name?: string;
  workspaceId?: string;
  workspaceSlug?: string;
  plan?: string;
}

export function identifyServerUser(input: IdentifyInput): void {
  const client = getClient();
  if (!client) return;
  try {
    const properties: Record<string, unknown> = {};
    if (input.email) properties.email = input.email;
    if (input.name) properties.name = input.name;
    if (input.workspaceId) properties.workspace_id = input.workspaceId;
    if (input.workspaceSlug) properties.workspace_slug = input.workspaceSlug;
    if (input.plan) properties.plan = input.plan;

    client.identify({
      distinctId: input.distinctId,
      properties,
    });
  } catch (err) {
    console.warn("[posthog] identify failed", err);
  }
}

export function groupServerEntity({
  groupType,
  groupKey,
  properties,
  distinctId,
}: {
  groupType: string;
  groupKey: string;
  properties?: Record<string, unknown>;
  distinctId?: string;
}): void {
  const client = getClient();
  if (!client) return;
  try {
    client.groupIdentify({
      groupType,
      groupKey,
      properties,
      distinctId,
    });
  } catch (err) {
    console.warn("[posthog] groupIdentify failed", err);
  }
}

/**
 * Force a flush before a serverless function returns. Call this in
 * route handler `finally` blocks if you need events delivered before
 * the response goes out (e.g. webhook → 200).
 */
export async function flushServerEvents(): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.flush();
  } catch (err) {
    console.warn("[posthog] flush failed", err);
  }
}

// -- Funnel helpers --------------------------------------------------------

export function captureWaitlistLead(params: {
  email: string;
  role?: string;
  companySize?: string;
  referralCode?: string;
  status?: string;
  distinctId?: string;
}): void {
  captureServerEvent({
    distinctId: params.distinctId || params.email,
    event: "waitlist_joined",
    properties: {
      email: params.email,
      role: params.role,
      company_size: params.companySize,
      referral_code: params.referralCode,
      status: params.status,
    },
  });
}

export function captureSignup(params: {
  userId?: string;
  email: string;
  status: "signed_in" | "pending_email_confirmation";
  workspaceId?: string;
  workspaceSlug?: string;
}): void {
  const distinctId = params.userId || params.email;
  identifyServerUser({
    distinctId,
    email: params.email,
    workspaceId: params.workspaceId,
    workspaceSlug: params.workspaceSlug,
  });
  if (params.workspaceId) {
    groupServerEntity({
      groupType: "workspace",
      groupKey: params.workspaceId,
      properties: params.workspaceSlug
        ? { slug: params.workspaceSlug }
        : undefined,
      distinctId,
    });
  }
  captureServerEvent({
    distinctId,
    event: "signup_completed",
    properties: {
      email: params.email,
      status: params.status,
      workspace_id: params.workspaceId,
    },
    groups: params.workspaceId
      ? { workspace: params.workspaceId }
      : undefined,
  });
}

export function captureLogin(params: {
  userId?: string;
  email: string;
  workspaceId?: string;
  workspaceSlug?: string;
}): void {
  const distinctId = params.userId || params.email;
  identifyServerUser({
    distinctId,
    email: params.email,
    workspaceId: params.workspaceId,
    workspaceSlug: params.workspaceSlug,
  });
  captureServerEvent({
    distinctId,
    event: "logged_in",
    properties: {
      email: params.email,
      workspace_id: params.workspaceId,
    },
    groups: params.workspaceId
      ? { workspace: params.workspaceId }
      : undefined,
  });
}

export function captureCheckoutInitiated(params: {
  userId?: string;
  email?: string;
  workspaceId: string;
  planId: string;
  planName: string;
  value: number;
  currency: string;
}): void {
  const distinctId = params.userId || params.email || "anonymous";
  captureServerEvent({
    distinctId,
    event: "initiate_checkout",
    properties: {
      plan_id: params.planId,
      plan_name: params.planName,
      value: params.value,
      currency: params.currency,
      workspace_id: params.workspaceId,
    },
    groups: { workspace: params.workspaceId },
  });
}

export function capturePurchase(params: {
  userId?: string;
  email?: string;
  workspaceId?: string;
  planName: string;
  value: number;
  currency: string;
  source: "checkout" | "invoice";
}): void {
  const distinctId = params.userId || params.email || "anonymous";
  if (params.workspaceId) {
    groupServerEntity({
      groupType: "workspace",
      groupKey: params.workspaceId,
      properties: { plan: params.planName },
      distinctId,
    });
  }
  captureServerEvent({
    distinctId,
    event: "purchase_completed",
    properties: {
      plan_name: params.planName,
      value: params.value,
      currency: params.currency,
      source: params.source,
      workspace_id: params.workspaceId,
    },
    groups: params.workspaceId
      ? { workspace: params.workspaceId }
      : undefined,
  });
}
