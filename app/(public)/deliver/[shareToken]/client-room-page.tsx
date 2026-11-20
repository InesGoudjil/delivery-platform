import type { ClientRoom } from "@/core/security/client-room";
import { loadRoomAssets, signRoomCover } from "@/lib/client-room/content";
import { recordRoomOpen } from "@/app/actions/deliveries/link-activity";
import { DeliveryRoomClient } from "./delivery-room-client";
import { DeliveryExpiredScreen } from "./_components/delivery-expired-screen";

/**
 * The client room for a visitor the room gate has already looked up (core/security/client-room.ts):
 * /deliver/<share token>, and /demo for the site's demo room. Nothing about the delivery's contents
 * (files, comments, description, client name, cover) is loaded until the room is open for this
 * visitor. Passcodes are entered in the dialog, never in the URL.
 */
export async function ClientRoomPage({ room }: { room: ClientRoom }) {
  const { delivery, services } = room;
  // Locked: only what the passcode screen shows. Open: the room's files, signed for this visitor.
  // Everything is read at once: the files don't depend on the branding or the plan.
  const isLocked = !room.canView;
  const [workspace, workspaceFeatures, portfolio, roomPage, cover, profile] = await Promise.all([
    services.workspace.getWorkspaceById(delivery.workspaceId),
    services.subscription.getFeatures(delivery.workspaceId),
    services.portfolio.getPortfolioByWorkspace(delivery.workspaceId).catch(() => null),
    isLocked ? null : loadRoomAssets(room),
    isLocked ? null : signRoomCover(room),
    !isLocked && room.member ? services.profile.getProfile(room.member.userId).catch(() => null) : null,
    // A guest's visit counts on their link (saved after the response).
    isLocked ? undefined : recordRoomOpen(room).catch(() => undefined),
  ]);
  const branding = {
    brandName: workspace?.brandName || "Studio Workspace",
    slug: workspace?.slug || "studio",
    logoUrl: workspace?.logoUrl || null,
    accentColor: workspace?.accentColor || "#f5551d",
  };
  // A suspended studio's portfolio is closed too (it would only lead to a 404).
  const portfolioUrl =
    portfolio?.isPublished && !room.suspended ? `/p/${portfolio.slug || branding.slug}` : undefined;

  if (!room.canView && (room.state === "expired" || room.state === "unavailable" || room.state === "revoked")) {
    return (
      <DeliveryExpiredScreen
        title={delivery.title}
        expiresAt={delivery.expiresAt ?? null}
        workspace={branding}
        portfolioUrl={portfolioUrl}
        reason={room.state}
      />
    );
  }

  const canWatermark = Boolean(workspaceFeatures?.watermark);
  const effectiveWatermark = canWatermark && Boolean(delivery.appearance?.watermarkMedia ?? delivery.isWatermarked);

  const initialAssets = roomPage?.assets ?? [];
  const initialTotalSizeBytes = initialAssets.reduce((sum, asset) => {
    const active = asset.activeVersion || asset.versions?.[0];
    return sum + (Number(active?.fileSizeBytes) || 0);
  }, 0);

  return (
    <DeliveryRoomClient
      delivery={{
        id: delivery.id,
        workspaceId: delivery.workspaceId,
        title: delivery.title,
        description: isLocked ? null : delivery.description,
        shareToken: delivery.shareToken,
        status: delivery.status,
        isDownloadAllowed: room.canDownload,
        isCommentAllowed: isLocked ? false : room.canComment,
        // Demo visitors try approvals in their browser (the server refuses them anyway).
        isApproveAllowed: room.isDemo || room.canApprove,
        isWatermarked: effectiveWatermark,
        appearance: {
          ...delivery.appearance,
          coverThumbnailUrl: cover,
          watermarkMedia: effectiveWatermark,
        },
        approvedAt: isLocked ? null : delivery.approvedAt,
        approvedByName: isLocked ? null : delivery.approvedByName,
        expiresAt: delivery.expiresAt,
        location: isLocked ? null : delivery.location,
        deliveryDate: isLocked ? null : delivery.deliveryDate,
        createdAt: delivery.createdAt,
      }}
      workspace={{ ...branding, whatsappNumber: isLocked ? null : portfolio?.whatsappNumber || null }}
      clientName={roomPage?.clientName ?? null}
      brandingLocation={isLocked ? null : portfolio?.stats?.location || null}
      initialTotalSizeBytes={initialTotalSizeBytes}
      initialAssetCount={roomPage?.totalAssetsCount ?? 0}
      initialAssets={initialAssets}
      isPasscodeProtected={Boolean(delivery.passcodeHash)}
      isInitiallyUnlocked={!isLocked}
      currentUser={
        room.member
          ? {
              id: room.member.userId,
              name: profile?.fullName || room.member.email?.split("@")[0] || null,
              email: room.member.email,
            }
          : null
      }
      isWorkspaceMember={room.member !== null}
      whiteLabel={Boolean(workspaceFeatures?.white_label)}
      demoMode={room.isDemo ? (room.member ? "member" : "visitor") : null}
    />
  );
}
