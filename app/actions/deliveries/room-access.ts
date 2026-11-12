import { cookies } from "next/headers";
import { getServerAdminServices, getServerServices } from "@/core/server";
import type { Delivery } from "@/core/entities/delivery";
import { requireClientRoom, type AdminServices, type ClientRoomNeed } from "@/core/security/client-room";
import { hasMinRole, requireDeliveryAccess, type WorkspaceRoleLevel } from "@/core/security/guards";
import type { RoomViewer } from "@/lib/client-room/content";
import { readGuestAuthorKeyHash } from "@/lib/security/delivery-token";

/**
 * Who is acting on a delivery, for actions used both in the client room and in the studio.
 *
 * - With a share token, the visitor is in the client room: the room gate decides
 *   (core/security/client-room.ts). A signed-in member of the studio is treated as a
 *   member with their workspace role; anyone else is a guest.
 * - With only a delivery id, the caller must be a signed-in member: a delivery id never
 *   grants guest access.
 *
 * Members write through their own Supabase session, so row-level security applies.
 * Guests write with the service role, so the action must first check that every id it
 * was sent belongs to `delivery` (lib/client-room/scope.ts).
 */

type UserServices = Awaited<ReturnType<typeof getServerServices>>;

export type DeliveryActor =
  | {
      kind: "guest";
      delivery: Delivery;
      services: AdminServices;
      adminServices: AdminServices;
      shareToken: string;
    }
  | {
      kind: "member";
      delivery: Delivery;
      services: UserServices;
      adminServices: AdminServices;
      userId: string;
      role: WorkspaceRoleLevel;
      shareToken: string | null;
    };

export interface DeliveryRefInput {
  shareToken?: string | null;
  deliveryId?: string | null;
}

/** The lowest member role for each kind of room action. */
const MEMBER_MIN_ROLE: Record<ClientRoomNeed, WorkspaceRoleLevel> = {
  view: "viewer",
  comment: "viewer",
  download: "viewer",
  approve: "editor",
};

/**
 * Accepts a share token or a delivery id. A bare string is a delivery id (studio callers);
 * the client room always sends `{ shareToken }`.
 */
export async function resolveDeliveryActor(
  ref: DeliveryRefInput | string,
  need: ClientRoomNeed,
  memberMinRole: WorkspaceRoleLevel = MEMBER_MIN_ROLE[need]
): Promise<DeliveryActor> {
  const input: DeliveryRefInput = typeof ref === "string" ? { deliveryId: ref } : ref ?? {};
  const shareToken = input.shareToken?.trim();

  if (shareToken) {
    const room = await requireClientRoom(shareToken, need);
    if (room.member) {
      if (!hasMinRole(room.member.role, memberMinRole)) {
        throw new Error(`Forbidden: Requires at least "${memberMinRole}" role permissions.`);
      }
      return {
        kind: "member",
        delivery: room.delivery,
        services: await getServerServices(),
        adminServices: room.services,
        userId: room.member.userId,
        role: room.member.role,
        shareToken: room.delivery.shareToken,
      };
    }
    return {
      kind: "guest",
      delivery: room.delivery,
      services: room.services,
      adminServices: room.services,
      shareToken: room.delivery.shareToken,
    };
  }

  const deliveryId = input.deliveryId?.trim();
  if (!deliveryId) throw new Error("Delivery not found.");
  const ctx = await requireDeliveryAccess(deliveryId, memberMinRole);
  return {
    kind: "member",
    delivery: ctx.delivery,
    services: ctx.services,
    adminServices: await getServerAdminServices(),
    userId: ctx.user.id,
    role: ctx.role,
    shareToken: null,
  };
}

/** The actor as a comment viewer (for `canModifyComment`). */
export async function actorViewer(actor: DeliveryActor): Promise<RoomViewer> {
  if (actor.kind === "member") return { kind: "member", userId: actor.userId, role: actor.role };
  return { kind: "guest", guestKeyHash: readGuestAuthorKeyHash(await cookies(), actor.shareToken) };
}
