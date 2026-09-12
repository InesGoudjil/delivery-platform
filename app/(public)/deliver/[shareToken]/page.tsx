import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getServerServices } from "@/core/server";
import { DeliveryRoomClient, DeliveryAssetItem } from "./delivery-room-client";

interface PageProps {
  params: Promise<{ shareToken: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params;
  try {
    const services = await getServerServices();
    const delivery = await services.delivery.getDeliveryByShareToken(shareToken);
    if (!delivery) {
      return {
        title: "Review Room | CineSpace",
        description: "Client delivery cut review portal",
      };
    }

    return {
      title: `${delivery.title} — Review Room | CineSpace`,
      description:
        delivery.description ||
        "Review video cuts, leave timecoded frame feedback, and approve deliverables.",
    };
  } catch {
    return {
      title: "Review Room | CineSpace",
    };
  }
}

export default async function ClientDeliveryPage({ params }: PageProps) {
  const { shareToken } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  // 1. Fetch full delivery details (delivery, client, assets, versions, feedback)
  const fullDetails = await services.delivery.getDeliveryWithFullDetails(shareToken);

  if (!fullDetails) {
    notFound();
  }

  // 2. Fetch workspace identity for custom branding & studio header
  const workspace = await services.workspace.getWorkspaceById(fullDetails.workspaceId);
  const brandName = workspace?.brandName || "Studio Workspace";
  const workspaceSlug = workspace?.slug || "studio";
  const logoUrl = workspace?.logoUrl || null;
  const accentColor = workspace?.accentColor || "#f5551d";

  // 3. Resolve client name
  const clientName = fullDetails.client?.name || null;

  // 4. Map assets, versions, and existing feedback
  const mappedAssets: DeliveryAssetItem[] = (fullDetails.assets || []).map((asset) => {
    const mappedVersions = (asset.versions || []).map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      rawFileUrl: v.rawFileUrl,
      hlsManifestUrl: v.hlsManifestUrl || null,
      thumbnailUrl: v.thumbnailUrl || null,
      fileSizeBytes: v.fileSizeBytes || null,
      durationSeconds: v.durationSeconds ? Number(v.durationSeconds) : null,
      transcodingStatus: v.transcodingStatus || null,
      isActiveVersion: v.isActiveVersion,
    }));

    const activeVersion =
      mappedVersions.find((v) => v.isActiveVersion) ||
      mappedVersions[0] ||
      null;

    const mappedFeedback = (asset.feedback || []).map((f) => ({
      id: f.id,
      assetVersionId: f.assetVersionId,
      authorName: f.authorName,
      commentText: f.commentText,
      timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
      isResolved: f.isResolved,
      createdAt: f.createdAt,
    }));

    return {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      aspectRatio: "16:9",
      isApproved: asset.isApproved,
      sortOrder: asset.sortOrder,
      versions: mappedVersions,
      activeVersion,
      feedback: mappedFeedback,
    };
  });

  // 5. Check passcode cookie verification
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(`delivery_access_${shareToken}`)?.value;
  const isInitiallyUnlocked = accessCookie === "verified";
  const isPasscodeProtected = Boolean(fullDetails.passcodeHash);

  // 6. Current user info if filmmaker / team member is inspecting
  let userProfile = null;
  if (user) {
    const profile = await services.profile.getProfile(user.id);
    userProfile = {
      id: user.id,
      name: profile?.fullName || user.email?.split("@")[0] || null,
      email: user.email || null,
    };
  }

  return (
    <DeliveryRoomClient
      delivery={{
        id: fullDetails.id,
        workspaceId: fullDetails.workspaceId,
        title: fullDetails.title,
        description: fullDetails.description,
        shareToken: fullDetails.shareToken,
        status: fullDetails.status,
        isDownloadAllowed: fullDetails.isDownloadAllowed,
        isWatermarked: fullDetails.isWatermarked,
        approvedAt: fullDetails.approvedAt,
        approvedByName: fullDetails.approvedByName,
        expiresAt: fullDetails.expiresAt,
        location: fullDetails.location,
        deliveryDate: fullDetails.deliveryDate,
        createdAt: fullDetails.createdAt,
      }}
      workspace={{
        brandName,
        slug: workspaceSlug,
        logoUrl,
        accentColor,
      }}
      clientName={clientName}
      initialAssets={mappedAssets}
      isPasscodeProtected={isPasscodeProtected}
      isInitiallyUnlocked={isInitiallyUnlocked}
      currentUser={userProfile}
    />
  );
}
