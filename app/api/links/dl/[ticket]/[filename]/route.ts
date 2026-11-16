import { NextRequest, NextResponse } from "next/server";
import { getServerAdminServices } from "@/core/server";
import { isDemoRoomDelivery, roomState } from "@/core/security/client-room";
import { parseDownloadTicket, verifyDownloadTicket } from "@/lib/security/download-ticket";
import { presignPrivateMediaUrl } from "@/lib/media-server";
import { versionInDelivery } from "@/lib/client-room/scope";
import { runAfterResponse } from "@/lib/after-response";
import { createScopedLogger } from "@/lib/logger";

/**
 * GET /api/links/dl/<ticket>/<filename>: a client-room guest's file download
 * (lib/security/download-ticket.ts).
 *
 * Checked on every use: the ticket's signature (it was made for the link as it is now), the link
 * (on, not expired, downloads allowed), the room (not archived or in cold storage, the studio not
 * suspended, not the demo room) and the file (one of the delivery's, not in the trash, uploaded).
 * Then the download is counted on the link and the browser is sent to a 10-minute signed URL.
 */

const log = createScopedLogger({ route: "api/links/dl" });
const SIGNED_URL_SECONDS = 600;

function refuse(status: number, message: string) {
  return new NextResponse(message, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticket: string; filename: string }> }) {
  const { ticket: rawTicket, filename: rawFilename } = await params;
  const ticket = parseDownloadTicket(decodeURIComponent(rawTicket));
  if (!ticket) return refuse(410, "This download link has expired. Open the delivery again to download the file.");

  try {
    const services = await getServerAdminServices();
    const found = await services.shareLink.findByIdWithDelivery(ticket.linkId).catch(() => null);
    if (!found || !verifyDownloadTicket(ticket, found.link)) {
      return refuse(401, "This download link isn't valid. Open the delivery again to download the file.");
    }
    const { link, delivery } = found;

    if (link.revokedAt || !link.canDownload) return refuse(403, "Downloads are turned off for this link.");
    // The ticket proves the visitor got in (passcode included), so only the room's other rules apply.
    const state = roomState({ ...delivery, expiresAt: link.expiresAt, passcodeHash: null }, true);
    if (state !== "open") return refuse(403, "This delivery is no longer available for download.");
    const [workspace, isDemo] = await Promise.all([
      services.workspace.getWorkspaceById(delivery.workspaceId),
      isDemoRoomDelivery(services, delivery.id),
    ]);
    if (workspace?.suspendedAt || isDemo) return refuse(403, "This delivery is no longer available for download.");

    const scoped = await versionInDelivery(services, delivery, ticket.versionId).catch(() => null);
    if (!scoped) return refuse(404, "That file isn't part of this delivery any more.");
    const { version, asset } = scoped;
    if (version.transcodingStatus === "pending" || version.transcodingStatus === "failed") {
      return refuse(404, "That file isn't ready yet.");
    }

    let filename = "Deliverable";
    try {
      filename = decodeURIComponent(rawFilename);
    } catch {
      // keep the default
    }
    filename = filename.replace(/[/\\?%*:|"<>\r\n]/g, "_").trim().slice(0, 180) || "Deliverable";

    const signed = await presignPrivateMediaUrl(
      version.rawFileUrl,
      services.storage,
      { workspaceId: delivery.workspaceId, expiresInSeconds: SIGNED_URL_SECONDS },
      filename
    );
    if (!signed) return refuse(404, "That file can't be downloaded right now.");

    runAfterResponse("share-link:download", () =>
      services.shareLink.recordEvent(link, "download", { assetId: asset.id })
    );

    const res = NextResponse.redirect(new URL(signed, req.url), 307);
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Content-Type-Options", "nosniff");
    return res;
  } catch (err) {
    log.warn({ err }, "Download ticket failed");
    return refuse(500, "The download couldn't start. Please try again.");
  }
}
