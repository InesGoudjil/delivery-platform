import { NextRequest, NextResponse } from "next/server";
import { getServerAdminServices } from "@/core/server";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Optional webhook secret check if configured
    if (env.SILO_WEBHOOK_SECRET) {
      const authHeader = req.headers.get("authorization") || req.headers.get("x-silo-secret");
      const urlSecret = req.nextUrl.searchParams.get("secret");
      const matched =
        authHeader === `Bearer ${env.SILO_WEBHOOK_SECRET}` ||
        authHeader === env.SILO_WEBHOOK_SECRET ||
        urlSecret === env.SILO_WEBHOOK_SECRET;

      if (!matched) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Handle AWS SNS Subscription Confirmation automatically
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      console.log("[Silo Webhook] Confirming AWS SNS Subscription via:", body.SubscribeURL);
      try {
        await fetch(body.SubscribeURL);
        return NextResponse.json({ success: true, message: "Subscription confirmed" });
      } catch (subErr) {
        console.error("[Silo Webhook] Failed to confirm SNS subscription:", subErr);
        return NextResponse.json({ error: "Subscription confirmation failed" }, { status: 500 });
      }
    }

    // Unwrap SNS Notification payload if wrapped
    let eventPayload = body;
    if (body.Type === "Notification" && typeof body.Message === "string") {
      try {
        eventPayload = JSON.parse(body.Message);
      } catch {
        eventPayload = body.Message;
      }
    }

    const services = await getServerAdminServices();
    const deliveryIdsToProcess = new Set<string>();

    // 1. Direct deliveryId passed in request (e.g. manual trigger or internal webhook)
    if (body.deliveryId) {
      deliveryIdsToProcess.add(body.deliveryId);
    }

    // 2. AWS S3 Event Notification format (s3:ObjectRestore:Completed)
    if (Array.isArray(eventPayload.Records)) {
      for (const record of eventPayload.Records) {
        const key = decodeURIComponent(record.s3?.object?.key || "");
        // Format: silo/workspaces/{workspaceId}/deliveries/{deliveryId}/assets/...
        const match = key.match(/deliveries\/([^/]+)\//);
        if (match && match[1]) {
          deliveryIdsToProcess.add(match[1]);
        }
      }
    }

    // 3. AWS EventBridge Event format
    if (eventPayload["detail-type"] === "Object Restore Completed" && eventPayload.detail?.object?.key) {
      const key = eventPayload.detail.object.key;
      const match = key.match(/deliveries\/([^/]+)\//);
      if (match && match[1]) {
        deliveryIdsToProcess.add(match[1]);
      }
    }

    if (deliveryIdsToProcess.size === 0) {
      return NextResponse.json({
        success: true,
        message: "No delivery IDs matched in the restore event payload.",
      });
    }

    const results = [];
    const origin = env.NEXT_PUBLIC_APP_URL || "https://cut.app";

    for (const deliveryId of deliveryIdsToProcess) {
      const restoreRes = await services.silo.checkAndFinalizeRestore(deliveryId, {
        origin,
      });
      results.push({ deliveryId, result: restoreRes });
    }

    return NextResponse.json({
      success: true,
      processed: results,
    });
  } catch (err: any) {
    console.error("[Silo Webhook] Unexpected error handling restore event:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
