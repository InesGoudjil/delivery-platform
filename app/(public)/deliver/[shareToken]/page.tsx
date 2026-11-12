import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getClientRoom } from "@/core/security/client-room";
import { loadRoomAssets, signRoomCover } from "@/lib/client-room/content";
import { DeliveryRoomClient } from "./delivery-room-client";
import { DeliveryExpiredScreen } from "./_components/delivery-expired-screen";

/**
 * The client room. Everything goes through the room gate (core/security/client-room.ts):
 * the share token is the only key, and nothing about the delivery's contents (files,
 * comments, description, client name, cover) is loaded until the room is open for this
 * visitor. Passcodes are entered in the dialog, never in the URL.
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

  const { delivery, services } = room;
  const [workspace, workspaceFeatures, portfolio] = await Promise.all([
    services.workspace.getWorkspaceById(delivery.workspaceId),
    services.subscription.getFeatures(delivery.workspaceId),
    services.portfolio.getPortfolioByWorkspace(delivery.workspaceId).catch(() => null),
  ]);
  const branding = {
    brandName: workspace?.brandName || "Studio Workspace",
    slug: workspace?.slug || "studio",
    logoUrl: workspace?.logoUrl || null,
    accentColor: workspace?.accentColor || "#f5551d",
  };
  const portfolioUrl = portfolio?.isPublished ? `/p/${portfolio.slug || branding.slug}` : undefined;

  if (!room.canView && (room.state === "expired" || room.state === "unavailable")) {
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

  const isLocked = !room.canView;
  const canWatermark = Boolean(workspaceFeatures?.watermark);
  const effectiveWatermark = canWatermark && Boolean(delivery.appearance?.watermarkMedia ?? delivery.isWatermarked);

  // Locked: only what the passcode screen shows. Open: the room's files, signed for this visitor.
  const roomPage = isLocked ? null : await loadRoomAssets(room);
  const [cover, profile] = isLocked
    ? [null, null]
    : await Promise.all([
        signRoomCover(room),
        room.member ? services.profile.getProfile(room.member.userId).catch(() => null) : null,
      ]);

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
      workspace={branding}
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
    />
  );
}
