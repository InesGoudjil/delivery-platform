import { requirePlatformAdminPage } from "@/core/admin/context";
import { loadDemoRoom, type DemoRoom } from "@/lib/client-room/demo-room";
import { AdminLoadError, AdminPageHeader } from "../../_components/page-header";
import { attempt } from "../../_lib/data";
import { DemoRoomCard, type DemoRoomCardData } from "./demo-room-card";

export const metadata = { title: "Site settings" };

/**
 * Site-wide settings (lib/site-settings.ts): what visitors of the public site see. One card per
 * setting, and every change goes through an audited admin action.
 */
export default async function AdminSitePage() {
  const admin = await requirePlatformAdminPage("/admin/site");
  const demoRoom = await attempt(() => loadDemoRoom(admin.services));

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Site settings"
        description="What visitors of the public site see. Every change needs a reason and is kept in the audit log."
      />
      {demoRoom.ok ? (
        <DemoRoomCard demo={toCardData(demoRoom.value)} />
      ) : (
        <AdminLoadError what="the demo room setting" error={demoRoom.error} />
      )}
    </div>
  );
}

/** Plain data for the card. The share token stays on the server: the admin previews at /demo. */
function toCardData({ setting, delivery, workspace, state }: DemoRoom): DemoRoomCardData {
  return {
    showOnLanding: setting.value.showOnLanding,
    updatedAt: setting.updatedAt,
    deliveryMissing: setting.value.deliveryId !== null && delivery === null,
    delivery: delivery
      ? {
          title: delivery.title,
          workspaceId: delivery.workspaceId,
          workspaceName: workspace?.brandName ?? "Unknown workspace",
          studioPath: workspace ? `/${workspace.slug}/deliveries/${delivery.id}` : null,
          state: state ?? "unavailable",
          workspaceSuspended: Boolean(workspace?.suspendedAt),
          expiresAt: delivery.expiresAt ?? null,
          commentsOn: delivery.isCommentAllowed !== false,
        }
      : null,
  };
}
