import type { CoreServices } from "@/core/container";
import type { Delivery } from "@/core/entities/delivery";
import type { Workspace } from "@/core/entities/workspace";
import { isWellFormedShareToken, roomState, type ClientRoomState } from "@/core/security/client-room";
import type { SiteSetting } from "@/core/services/site-settings.service";

/*
 * The site's demo room: a real delivery, picked in Admin -> Site settings, that anyone can open
 * at /demo (the landing page links to it when the admin switches that on). The room gate keeps
 * guests from saving anything in it (core/security/client-room.ts).
 */

type Services = Pick<CoreServices["services"], "siteSettings" | "delivery" | "workspace">;

export interface DemoRoom {
  /** What the admin saved. */
  setting: SiteSetting<"demo_room">;
  /** The demo delivery. Null when none is set, or when the saved one no longer exists. */
  delivery: Delivery | null;
  workspace: Workspace | null;
  /** The room as a guest finds it (no unlock cookie). Visitors can only use an "open" one. */
  state: ClientRoomState | null;
}

/**
 * The demo delivery the setting points to, or null. For /demo, which opens it through the room
 * gate (that reads the workspace itself). Needs service-role services.
 */
export async function loadDemoDelivery(services: Pick<Services, "siteSettings" | "delivery">): Promise<Delivery | null> {
  const deliveryId = (await services.siteSettings.get("demo_room")).deliveryId;
  return deliveryId ? services.delivery.getDeliveryById(deliveryId) : null;
}

/** Reads the setting, then the delivery and workspace it points to. Needs service-role services. */
export async function loadDemoRoom(services: Services): Promise<DemoRoom> {
  const setting = await services.siteSettings.getWithMeta("demo_room");
  const deliveryId = setting.value.deliveryId;
  if (!deliveryId) return { setting, delivery: null, workspace: null, state: null };

  const delivery = await services.delivery.getDeliveryById(deliveryId);
  if (!delivery) return { setting, delivery: null, workspace: null, state: null };

  const workspace = await services.workspace.getWorkspaceById(delivery.workspaceId);
  const state: ClientRoomState = workspace?.suspendedAt ? "unavailable" : roomState(delivery, false);
  return { setting, delivery, workspace, state };
}

/** True when the landing page should link to /demo: switched on, and the room opens for anyone. */
export function isDemoRoomLive(demo: DemoRoom): boolean {
  return demo.setting.value.showOnLanding && demo.delivery !== null && demo.state === "open";
}

/**
 * The share token in a review link: a full URL or path with /deliver/<token>, or the bare token.
 * Null when there isn't one.
 */
export function shareTokenFromReviewLink(link: string): string | null {
  const value = link.trim();
  const match = /\/deliver\/([^/?#\s]+)/.exec(value);
  const candidate = match ? decodeURIComponentSafe(match[1]) : value;
  return isWellFormedShareToken(candidate) ? candidate.trim() : null;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
