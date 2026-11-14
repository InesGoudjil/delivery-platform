import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerAdminServices } from "@/core/server";
import { configuredAppOrigin } from "@/lib/app-origin";
import { env } from "@/lib/env";
import { createScopedLogger } from "@/lib/logger";
import { HEARTBEAT_JOBS } from "@/core/repositories/system-heartbeat.repository";

/**
 * Scheduled notification work, run every few minutes by a scheduler (docs/notifications.md):
 * - the studio emails for client comments whose ten-minute batch has closed (library 26);
 * - the WhatsApp comment alerts whose review session has gone quiet.
 *
 * Called with "Authorization: Bearer <CRON_SECRET>" (what Vercel Cron sends). Refuses to run
 * while CRON_SECRET is unset or too short.
 */

const log = createScopedLogger({ route: "api/cron/notifications" });

const MIN_SECRET_LENGTH = 32;

/** This job's runs are recorded in system_heartbeats under this name (shown in the admin panel). */
const NOTIFICATIONS_JOB = HEARTBEAT_JOBS.notifications;

export const dynamic = "force-dynamic";

function configuredSecret(): string | null {
  const secret = env.CRON_SECRET.trim();
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

/** Constant-time comparison; hashing first makes it independent of the inputs' lengths. */
function secretsMatch(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Recording a heartbeat must never stop the job itself. */
async function beat(record: () => Promise<void>) {
  try {
    await record();
  } catch (err) {
    log.warn({ err }, "Couldn't record the scheduler heartbeat");
  }
}

async function run(req: NextRequest) {
  const secret = configuredSecret();
  if (!secret) {
    return NextResponse.json({ error: "Scheduled jobs aren't configured (CRON_SECRET)." }, { status: 503 });
  }
  const presented = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!presented || !secretsMatch(presented, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = configuredAppOrigin();
  if (!origin) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL isn't set to the app's public URL." }, { status: 503 });
  }

  try {
    const services = await getServerAdminServices();
    await beat(() => services.heartbeat.started(NOTIFICATIONS_JOB));

    // Each job runs on its own, so a failure in one doesn't hold back the other.
    const commentEmails = await services.commentEmail.flushDue(origin).catch((err: unknown) => {
      log.error({ err }, "Comment emails failed");
      return null;
    });

    let whatsapp: { sent: number; failed: number } | "not configured" | null;
    if (services.whatsapp.isConfigured()) {
      whatsapp = await services.whatsapp.flushQuietCommentBatches(origin).catch((err: unknown) => {
        log.error({ err }, "WhatsApp comment alerts failed");
        return null;
      });
    } else {
      whatsapp = "not configured";
    }

    const ok = commentEmails !== null && whatsapp !== null;
    await beat(() =>
      services.heartbeat.finished(
        NOTIFICATIONS_JOB,
        ok ? "ok" : "failed",
        { commentEmails, whatsapp },
        ok ? null : "A job failed; see the server logs."
      )
    );
    return NextResponse.json({ ok, commentEmails, whatsapp }, { status: ok ? 200 : 500 });
  } catch (err) {
    log.error({ err }, "Scheduled notifications failed");
    return NextResponse.json({ error: "Scheduled notifications failed." }, { status: 500 });
  }
}

export function GET(req: NextRequest) {
  return run(req);
}

export function POST(req: NextRequest) {
  return run(req);
}
