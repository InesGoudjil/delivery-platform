import { createHash } from "crypto";
import { env } from "@/lib/env";

/**
 * Server-side Meta Conversions API helper.
 *
 * Sends events directly to `graph.facebook.com/v18.0/{pixelId}/events` so
 * that events lost to ad-blockers, iOS 14.5+ opt-out, or slow network
 * are still delivered. Pair every server call with a `fbq('track', ...)`
 * using the same `eventId` so Meta deduplicates.
 *
 * Never throws — a Meta outage must not break the user-facing flow.
 */

const PIXEL_ID = env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = env.META_ACCESS_TOKEN;
const TEST_EVENT_CODE = env.META_TEST_EVENT_CODE;
const ENABLED = env.isMetaCapiEnabled;

const ENDPOINT = (pixelId: string) =>
  `https://graph.facebook.com/v18.0/${pixelId}/events`;

export type ActionSource =
  | "website"
  | "app"
  | "phone_call"
  | "chat"
  | "physical_store"
  | "system_generated"
  | "other";

export interface CapiUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  externalId?: string | null;
  // Free-form keys that Meta expects to be hashed, e.g. "db", "ge", "lc".
  [key: string]: string | null | undefined;
}

export interface CapiCustomData {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  status?: string;
  [key: string]: unknown;
}

export interface ServerEventInput {
  eventName: string;
  eventId: string;
  eventTime?: number; // seconds since epoch
  userData?: CapiUserData;
  customData?: CapiCustomData;
  eventSourceUrl?: string;
  actionSource?: ActionSource;
  // Capture from next/headers if available.
  clientIp?: string;
  userAgent?: string;
  // fbp/fbc cookies from the browser, if you forward them.
  fbp?: string;
  fbc?: string;
}

export interface ServerEventResult {
  ok: boolean;
  events_received?: number;
  fbtrace_id?: string;
  error?: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim().toLowerCase();
  return trimmed === "" ? undefined : trimmed;
}

function hashUserData(input: CapiUserData = {}): Record<string, string> {
  const out: Record<string, string> = {};

  const email = normalize(input.email);
  if (email) out.em = sha256(email);

  const phone = normalize(input.phone);
  if (phone) out.ph = sha256(phone.replace(/[^0-9]/g, ""));

  const first = normalize(input.firstName);
  if (first) out.fn = sha256(first);

  const last = normalize(input.lastName);
  if (last) out.ln = sha256(last);

  const city = normalize(input.city);
  if (city) out.ct = sha256(city);

  const state = normalize(input.state);
  if (state) out.st = sha256(state);

  const country = normalize(input.country);
  if (country) out.country = sha256(country);

  const zip = normalize(input.zip);
  if (zip) out.zp = sha256(zip);

  const externalId = normalize(input.externalId);
  if (externalId) out.external_id = sha256(externalId);

  return out;
}

/**
 * Send a single event to Meta's Conversions API. Returns the result
 * without throwing. Always check `result.ok` and log on failure.
 */
export async function sendServerEvent(
  event: ServerEventInput
): Promise<ServerEventResult> {
  return sendServerEvents([event]);
}

/**
 * Send a batch of events in one request (more efficient and the
 * documented way to send multiple events from a webhook handler).
 */
export async function sendServerEvents(
  events: ServerEventInput[]
): Promise<ServerEventResult> {
  if (!ENABLED || !PIXEL_ID || !ACCESS_TOKEN) {
    return { ok: true, events_received: 0 };
  }
  if (events.length === 0) {
    return { ok: true, events_received: 0 };
  }

  const payload = {
    data: events.map((e) => {
      const userData: Record<string, string> = hashUserData(e.userData);
      if (e.clientIp) userData.client_ip_address = e.clientIp;
      if (e.userAgent) userData.client_user_agent = e.userAgent;
      if (e.fbp) userData.fbp = e.fbp;
      if (e.fbc) userData.fbc = e.fbc;

      const data: Record<string, unknown> = {
        event_name: e.eventName,
        event_time: e.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: e.eventId,
        action_source: e.actionSource ?? "website",
        event_source_url: e.eventSourceUrl,
        user_data: userData,
        custom_data: e.customData,
      };

      // Strip undefined keys so the payload is clean.
      for (const k of Object.keys(data)) {
        if (data[k] === undefined) delete data[k];
      }

      return data;
    }),
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(ENDPOINT(PIXEL_ID), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        access_token: ACCESS_TOKEN,
      }),
      // Don't keep the webhook hanging on a slow Meta response.
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[meta-capi] non-2xx response (${res.status}):`,
        text.slice(0, 500)
      );
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const json = (await res.json()) as {
      events_received?: number;
      fbtrace_id?: string;
      error?: { message?: string };
    };
    if (json.error) {
      console.error("[meta-capi] api error:", json.error.message);
      return { ok: false, error: json.error.message };
    }
    return {
      ok: true,
      events_received: json.events_received,
      fbtrace_id: json.fbtrace_id,
    };
  } catch (err: any) {
    console.error("[meta-capi] fetch failed:", err?.message || err);
    return { ok: false, error: err?.message || "fetch failed" };
  }
}
