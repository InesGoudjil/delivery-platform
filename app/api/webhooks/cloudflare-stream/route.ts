import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerCore } from "@/core/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody || "{}");

    const core = await getServerCore();

    // Verify webhook signature if method is available
    if (typeof core.storageProvider.verifyWebhookSignature === "function") {
      const headersMap: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headersMap[key.toLowerCase()] = value;
      });

      const isValid = core.storageProvider.verifyWebhookSignature(rawBody, headersMap);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 400 }
        );
      }
    }

    await core.services.upload.handleTranscodeWebhook(payload);

    revalidatePath("/[workspaceSlug]/deliveries/[projectId]", "page");
    revalidatePath("/[workspaceSlug]/deliveries", "page");
    revalidatePath("/deliver/[shareToken]", "page");
    revalidatePath("/[workspaceSlug]/portfolio", "page");
    revalidatePath("/p/[handle]", "page");

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Cloudflare Stream Webhook Error]:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
