import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAdminServices } from "@/core/server";
import { getClientRoom, type ClientRoom } from "@/core/security/client-room";
import { loadDemoRoom } from "@/lib/client-room/demo-room";
import { createScopedLogger } from "@/lib/logger";
import { ClientRoomPage } from "../deliver/[shareToken]/client-room-page";

const log = createScopedLogger({ page: "DemoRoom" });

/**
 * The demo room: the delivery an admin picked in Admin -> Site settings, opened the way a client
 * sees it. Visitors can try everything, but nothing they do is saved: the room gate refuses it,
 * and the page keeps it in their browser. Until a demo delivery is set, or while it can't be
 * opened, /demo shows the mock screen at /delivery-view.
 */

// Rendered on every request: the setting can change at any time, and a page built while none was
// set would otherwise be kept as a redirect.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demo delivery room | CineSpace",
  description: "See what your clients see: a real CineSpace review room, with versions, timecoded notes and approvals.",
  robots: { index: false, follow: true },
};

export default async function DemoRoomPage() {
  const room = await openDemoRoom();
  if (!room) redirect("/delivery-view");
  return <ClientRoomPage room={room} />;
}

async function openDemoRoom(): Promise<ClientRoom | null> {
  try {
    const demo = await loadDemoRoom(await getServerAdminServices());
    if (!demo.delivery) return null;
    const room = await getClientRoom(demo.delivery.shareToken);
    // Visitors only get a room that's open. Members of its workspace can preview it in any state.
    if (!room?.isDemo || !(room.state === "open" || room.member)) return null;
    return room;
  } catch (err) {
    log.warn({ err }, "Couldn't open the demo room, showing the mock screen instead");
    return null;
  }
}
