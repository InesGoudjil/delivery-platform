import type { ClientRoom } from "@/core/security/client-room";
import { isStoredShareLink } from "@/core/entities/share-link";
import { runAfterResponse } from "@/lib/after-response";
import { shareLinkVisitor } from "@/lib/security/visitor";
import { resolveRequestOrigin } from "./helpers";

/**
 * Link activity the client room itself notes: visits and passcode attempts. Only guests on a
 * stored link count (not studio members, not the demo room, not before the share_links
 * migration). Call these while the request is open: they read its headers, then save after
 * the response so the visitor never waits.
 */

function counted(room: ClientRoom): boolean {
  return !room.member && !room.isDemo && isStoredShareLink(room.link);
}

/** A guest opened the room. The link's first open sends its "First open" alert, when that's on. */
export async function recordRoomOpen(room: ClientRoom): Promise<void> {
  if (!counted(room) || room.state !== "open") return;
  const { link, services, delivery } = room;
  const [visitor, origin] = await Promise.all([shareLinkVisitor(), resolveRequestOrigin()]);

  runAfterResponse("share-link:open", async () => {
    const { firstOpen } = await services.shareLink.recordEvent(link, "open", visitor);
    if (!firstOpen || !link.notifyOnOpen) return;
    const recipients = await services.member.listNotificationRecipients(delivery.workspaceId, ["owner", "admin"]);
    await services.notification.notifyLinkOpened({
      deliveryId: delivery.id,
      linkLabel: link.label,
      recipientName: link.recipientName,
      recipientEmails: recipients.map((recipient) => recipient.email),
      origin,
    });
  });
}

/** A guest tried the passcode: right ("unlock") or wrong ("unlock_failed"). */
export async function recordUnlockAttempt(room: ClientRoom, unlocked: boolean): Promise<void> {
  if (!counted(room)) return;
  const { link, services } = room;
  const visitor = await shareLinkVisitor();
  runAfterResponse(`share-link:${unlocked ? "unlock" : "unlock_failed"}`, () =>
    services.shareLink.recordEvent(link, unlocked ? "unlock" : "unlock_failed", visitor)
  );
}
