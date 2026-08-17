import { NextRequest, NextResponse } from "next/server";
import { getServerServices } from "@/core/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody || "{}");

    const signatureHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      signatureHeaders[key.toLowerCase()] = value;
    });

    const services = await getServerServices();
    const success = await services.upload.handleCloudflareWebhook(
      payload,
      signatureHeaders
    );

    if (!success) {
      return NextResponse.json(
        { error: "Webhook verification failed or ignored" },
        { status: 400 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
