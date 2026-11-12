import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerAdminServices } from "@/core/server";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ route: "api/webhooks/cloudflare-stream" });

/**
 * Cloudflare Stream "video ready / failed" webhook.
 *
 * Only signed requests are processed: without CLOUDFLARE_WEBHOOK_SECRET (or with the mock
 * provider) every request is refused. The version to update is found by the Stream UID the
 * server stored in it, not by the payload's metadata, and written with the service role
 * (file-location columns aren't writable by API users).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const services = await getServerAdminServices();
    const storage = services.storage;

    const headersMap: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersMap[key.toLowerCase()] = value;
    });

    const isValid =
      typeof storage.verifyWebhookSignature === "function" &&
      storage.verifyWebhookSignature(rawBody, headersMap) === true;
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { updated } = await services.upload.handleTranscodeWebhook(payload);

    if (updated > 0) {
      revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
      revalidatePath("/[workspaceSlug]/deliveries", "page");
      revalidatePath("/deliver/[shareToken]", "page");
      revalidatePath("/[workspaceSlug]/portfolio", "page");
      revalidatePath("/p/[handle]", "page");
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    log.error({ err: error }, "Cloudflare Stream webhook processing error");
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
