import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerAdminServices } from "@/core/server";
import { parseSiloArchiveKey } from "@/core/services/silo.service";
import { env } from "@/lib/env";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ route: "api/silo/restore-webhook" });

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRET = "your-silo-webhook-secret";
/** Upper bound on deliveries finalized per call; each one may copy large files. */
const MAX_DELIVERIES_PER_EVENT = 25;

/** SILO_WEBHOOK_SECRET, or null while it is unset, the .env.example placeholder, or too short to be safe. */
function configuredSecret(): string | null {
  const secret = env.SILO_WEBHOOK_SECRET.trim();
  if (secret.length < MIN_SECRET_LENGTH || secret === PLACEHOLDER_SECRET) return null;
  return secret;
}

/**
 * The secret presented in a header: "Authorization: Bearer <secret>", "X-Silo-Secret: <secret>",
 * or HTTP Basic auth with the secret as the password (AWS SNS sends the credentials of an
 * https://user:secret@host/... subscription URL that way). Never read from the query string.
 */
function presentedSecret(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization")?.trim();
  if (authorization) {
    const bearer = authorization.match(/^Bearer\s+(.+)$/i);
    if (bearer) return bearer[1].trim();

    const basic = authorization.match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
    if (basic) {
      const decoded = Buffer.from(basic[1], "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      return separator >= 0 ? decoded.slice(separator + 1) : null;
    }
  }
  return req.headers.get("x-silo-secret")?.trim() || null;
}

/** Constant-time comparison; hashing first makes it independent of the inputs' lengths. */
function secretsMatch(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function decodeS3Key(raw: unknown): string {
  if (typeof raw !== "string") return "";
  try {
    // S3 event keys are URL-encoded, with "+" for spaces.
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

interface RestoreTarget {
  deliveryId: string;
  workspaceId: string;
}

/**
 * Delivery and workspace ids of the archive objects in an S3 "ObjectRestore:Completed"
 * notification (direct or through SNS) or an EventBridge "Object Restore Completed" event.
 * Only keys under The Silo's own prefix, in the configured archive bucket, count.
 */
function restoreTargets(payload: any): RestoreTarget[] {
  const targets = new Map<string, RestoreTarget>();
  const add = (bucket: unknown, rawKey: unknown) => {
    if (typeof bucket === "string" && bucket && bucket !== env.AWS_S3_SILO_BUCKET) return;
    const parsed = parseSiloArchiveKey(decodeS3Key(rawKey));
    if (parsed) {
      targets.set(parsed.deliveryId, { deliveryId: parsed.deliveryId, workspaceId: parsed.workspaceId });
    }
  };

  if (Array.isArray(payload?.Records)) {
    for (const record of payload.Records) {
      if (typeof record?.eventName === "string" && !record.eventName.startsWith("ObjectRestore:Completed")) {
        continue;
      }
      add(record?.s3?.bucket?.name, record?.s3?.object?.key);
    }
  }

  if (payload?.["detail-type"] === "Object Restore Completed") {
    add(payload.detail?.bucket?.name, payload.detail?.object?.key);
  }

  return Array.from(targets.values());
}

export async function POST(req: NextRequest) {
  // The Silo kill switch: while it is off, this endpoint does not exist.
  if (!env.isSiloEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = configuredSecret();
  if (!secret) {
    log.error("SILO_WEBHOOK_SECRET is missing or too weak; refusing Silo restore events");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const presented = presentedSecret(req);
  if (!presented || !secretsMatch(presented, secret)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": 'Basic realm="silo-restore-webhook"' } }
    );
  }

  try {
    const rawBody = await req.text();
    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Handle AWS SNS Subscription Confirmation with strict SSRF mitigation
    if (body?.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      try {
        const parsedUrl = new URL(body.SubscribeURL);

        // Strict protocol check: HTTPS only
        if (parsedUrl.protocol !== "https:") {
          log.error({ subscribeUrl: body.SubscribeURL }, "SSRF attempt blocked: non-https SubscribeURL");
          return NextResponse.json({ error: "Invalid SubscribeURL protocol" }, { status: 400 });
        }

        // Strict hostname validation: strictly match AWS SNS domain pattern
        const isAwsSns = /^sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(parsedUrl.hostname);
        if (!isAwsSns) {
          log.error({ hostname: parsedUrl.hostname }, "SSRF attempt blocked: untrusted hostname");
          return NextResponse.json({ error: "Untrusted SubscribeURL host" }, { status: 400 });
        }

        log.info({ href: parsedUrl.href }, "Confirming AWS SNS Subscription");
        await fetch(parsedUrl.href);
        return NextResponse.json({ success: true, message: "Subscription confirmed" });
      } catch (subErr: unknown) {
        log.error({ err: subErr }, "Failed to confirm SNS subscription");
        return NextResponse.json({ error: "Subscription confirmation failed" }, { status: 500 });
      }
    }

    // Unwrap SNS Notification payload if wrapped
    let eventPayload = body;
    if (body?.Type === "Notification" && typeof body.Message === "string") {
      try {
        eventPayload = JSON.parse(body.Message);
      } catch {
        eventPayload = null;
      }
    }

    // Delivery ids come only from archive object keys in the event, never from a free-form
    // field, and each one is re-checked against the database before anything runs.
    const targets = restoreTargets(eventPayload);
    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No Silo archive objects matched in the restore event payload.",
      });
    }
    if (targets.length > MAX_DELIVERIES_PER_EVENT) {
      log.warn({ count: targets.length }, "Silo restore event names more deliveries than one call handles");
    }

    const services = await getServerAdminServices();
    const processed: { deliveryId: string; status: string; isReady?: boolean }[] = [];
    let failed = false;

    for (const target of targets.slice(0, MAX_DELIVERIES_PER_EVENT)) {
      try {
        const delivery = await services.delivery.getDeliveryById(target.deliveryId);
        if (!delivery || delivery.workspaceId.toLowerCase() !== target.workspaceId) {
          processed.push({ deliveryId: target.deliveryId, status: "unknown_delivery" });
          continue;
        }
        if (delivery.siloStatus !== "restoring") {
          processed.push({ deliveryId: target.deliveryId, status: "not_restoring" });
          continue;
        }

        // Re-reads the restore state of every archived file from S3; the event is only a hint.
        const result = await services.silo.checkAndFinalizeRestore(delivery.id);
        processed.push({ deliveryId: delivery.id, status: result.status, isReady: result.isReady });
      } catch (err: unknown) {
        failed = true;
        log.error({ err, deliveryId: target.deliveryId }, "Failed to finalize Silo restore");
        processed.push({ deliveryId: target.deliveryId, status: "error" });
      }
    }

    // A 5xx makes SNS / EventBridge retry; finalizing is safe to repeat.
    return NextResponse.json({ success: !failed, processed }, { status: failed ? 500 : 200 });
  } catch (err: unknown) {
    log.error({ err }, "Unexpected error handling restore event");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
