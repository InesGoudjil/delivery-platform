import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClientRoom } from "@/core/security/client-room";
import { ClientRoomPage } from "./client-room-page";

/**
 * The client room. Everything goes through the room gate (core/security/client-room.ts):
 * the share token is the only key. The page itself is ClientRoomPage, shared with /demo.
 */

interface PageProps {
  params: Promise<{ shareToken: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const generic: Metadata = {
    title: "Private delivery | CineSpace",
    description: "A private review room shared with you by a studio.",
    robots: { index: false, follow: false },
  };
  try {
    const room = await getClientRoom(shareToken);
    if (!room || !room.canView || room.state !== "open") return generic;
    return { ...generic, title: `${room.delivery.title} — Review Room | CineSpace` };
  } catch {
    return generic;
  }
}

export default async function ClientDeliveryPage(props: PageProps) {
  const { shareToken } = await props.params;
  const room = await getClientRoom(shareToken);
  if (!room) notFound();
  return <ClientRoomPage room={room} />;
}
