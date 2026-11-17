import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { hasMinRole } from "@/core/security/guards";
import { presignDeliveryAssets, presignPrivateMediaUrl } from "@/lib/media-server";
import {
  DeliveryDetailClient,
  AssetVersionItem,
  FeedbackItem,
} from "./delivery-detail-client";
import { DeliveryNavHeader } from "./_components/delivery-nav-header";
import DeliveryDetailLoading from "./loading";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const services = await getServerServices();
  const [user, workspace] = await Promise.all([
    services.auth.getCurrentUser(),
    services.workspace.getWorkspaceBySlug(workspaceSlug),
  ]);

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/deliveries/${projectId}`);
  }

  if (!workspace) {
    redirect("/");
  }

  return (
    <Suspense fallback={<DeliveryDetailLoading />}>
      <DeliveryDetailContent
        workspace={workspace}
        projectId={projectId}
        userId={user.id}
      />
    </Suspense>
  );
}

async function DeliveryDetailContent({
  workspace,
  projectId,
  userId,
}: {
  workspace: any;
  projectId: string;
  userId: string;
}) {
  const services = await getServerServices();
  const INITIAL_PAGE_SIZE = 12;

  // 1. The delivery with its first page of files (versions, comments, counts), and at the same
  //    time what doesn't depend on it: the portfolio for 1-click publishing, the plan's features,
  //    and whether the viewer may change the client link's settings (admins and owners; the
  //    server and the database enforce the same rule).
  const [fullDetails, portfolio, workspaceFeatures, membership, linksEnabled] = await Promise.all([
    services.delivery.getDeliveryWithFullDetails(projectId, {
      page: 1,
      limit: INITIAL_PAGE_SIZE,
    }),
    services.portfolio.getOrCreatePortfolio(
      workspace.id,
      workspace.brandName || "Cinematic Portfolio",
      workspace.slug
    ),
    services.subscription.getFeatures(workspace.id),
    services.member.getMember(workspace.id, userId).catch(() => null),
    services.shareLink.isInstalled(),
  ]);

  let project = fullDetails ? fullDetails : null;

  // Fallback showcase project details if opened from a demo ID
  if (!project) {
    const demoTitles: Record<string, { title: string; client: string; duration: number }> = {
      del_1: { title: "Omakase Counter Launch Film", client: "Lost in Tokyo Group", duration: 47 },
      del_2: { title: "Aisha & Omar — Wedding Teaser", client: "Private Client", duration: 192 },
      del_3: { title: "Mercedes GT3 Desert Spec Reel", client: "Prestige Rentals Dubai", duration: 80 },
      del_4: { title: "Clean Performance Launch Reel", client: "Clean Snacks UAE", duration: 30 },
    };

    const demo = demoTitles[projectId] || {
      title: "Omakase Counter Launch Film",
      client: "Lost in Tokyo Group",
      duration: 47,
    };

    project = {
      id: projectId,
      workspaceId: workspace.id,
      clientId: null,
      client: null,
      title: demo.title,
      description: "47-second promotional cut for launch event",
      shareToken: `token-${projectId}`,
      passcodeHash: null,
      status: "in_review",
      isDownloadAllowed: true,
      isCommentAllowed: true,
      notifyOnDownload: false,
      isWatermarked: false,
      approvedAt: null,
      approvedByName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assets: [],
    } as any;
  }

  // 2. Resolve client details (name, email, phone)
  let clientName = project?.client?.name || (project as any).clientName || "Private Client";
  let clientEmail = project?.client?.email || "";
  let clientPhone = project?.client?.phoneNumber || "";

  if (project.clientId && (!project.client || !clientEmail || !clientPhone)) {
    const client = await services.client.getClientById(project.clientId);
    if (client) {
      if (!clientName || clientName === "Private Client") clientName = client.name;
      if (!clientEmail && client.email) clientEmail = client.email;
      if (!clientPhone && client.phoneNumber) clientPhone = client.phoneNumber;
    }
  }

  // 3. Map assets and feedback
  let mappedAssets: Array<{
    id: string;
    title: string;
    type: string;
    aspectRatio?: string;
    isApproved?: boolean;
    versions: AssetVersionItem[];
    activeVersion?: AssetVersionItem | null;
    feedback?: FeedbackItem[];
  }> = [];

  let initialFeedback: FeedbackItem[] = [];

  if (fullDetails && fullDetails.assets.length > 0) {
    mappedAssets = fullDetails.assets.map((a) => {
      const mappedVersions: AssetVersionItem[] = a.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        downloadUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl,
        thumbnailUrl:
          v.thumbnailUrl ||
          (a.type === "photo_gallery" || (a.type as string) === "photo" || (a.type as string) === "still"
            ? v.rawFileUrl
            : null) ||
          "/images/hero.jpg",
        durationSeconds: v.durationSeconds,
        fileSizeBytes: v.fileSizeBytes,
        transcodingStatus: v.transcodingStatus,
        isActiveVersion: v.isActiveVersion,
        createdAt: v.createdAt,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

      const mappedFeedback: FeedbackItem[] = (a.feedback || []).map((f) => ({
        id: f.id,
        assetVersionId: f.assetVersionId,
        authorName: f.authorName,
        commentText: f.commentText,
        timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
        createdAt: f.createdAt,
        isResolved: f.isResolved,
      }));

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        aspectRatio: a.aspectRatio,
        isApproved: a.isApproved,
        versions: mappedVersions,
        activeVersion,
        feedback: mappedFeedback,
      };
    });

    initialFeedback = mappedAssets.flatMap((a) => a.feedback || []);
  } else {
    // If fallback or assets directly from asset repo
    const dbAssets = await services.asset.listAssets(project.id);
    if (dbAssets.length > 0) {
      mappedAssets = await Promise.all(
        dbAssets.map(async (a) => {
          const versions = await services.asset.listVersions(a.id);
          const mappedVersions: AssetVersionItem[] = versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            rawFileUrl: v.rawFileUrl,
            downloadUrl: v.rawFileUrl,
            hlsManifestUrl: v.hlsManifestUrl,
            thumbnailUrl:
              v.thumbnailUrl ||
              (a.type === "photo_gallery" || (a.type as string) === "photo" || (a.type as string) === "still"
                ? v.rawFileUrl
                : null) ||
              "/images/hero.jpg",
            durationSeconds: v.durationSeconds,
            fileSizeBytes: v.fileSizeBytes,
            transcodingStatus: v.transcodingStatus,
            isActiveVersion: v.isActiveVersion,
            createdAt: v.createdAt,
          }));

          const activeVersion = mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

          let assetFeedback: FeedbackItem[] = [];
          if (mappedVersions.length > 0) {
            const versionIds = mappedVersions.map((v) => v.id);
            const feedbackRows = await services.feedback.listFeedbackForVersions(versionIds);
            assetFeedback = feedbackRows.map((f) => ({
              id: f.id,
              assetVersionId: f.assetVersionId,
              authorName: f.authorName,
              commentText: f.commentText,
              timestampSeconds: f.timestampSeconds ? Number(f.timestampSeconds) : null,
              createdAt: f.createdAt,
              isResolved: f.isResolved,
            }));
          }

          return {
            id: a.id,
            title: a.title,
            type: a.type,
            aspectRatio: a.aspectRatio,
            isApproved: a.isApproved,
            versions: mappedVersions,
            activeVersion,
            feedback: assetFeedback,
          };
        })
      );

      initialFeedback = mappedAssets.flatMap((a) => a.feedback || []);
    }
  }

  // If no feedback yet, provide sample cues
  if (initialFeedback.length === 0) {
    // initialFeedback = [
    //   {
    //     id: "fb_1",
    //     authorName: clientName,
    //     commentText: "Love this cut! Can we make the intro sequence a touch faster?",
    //     timestampSeconds: 12,
    //     createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    //   },
    //   {
    //     id: "fb_2",
    //     authorName: workspace.brandName || "Filmmaker",
    //     commentText: "On it — adjusting speed ramp on the sushi prep shot.",
    //     timestampSeconds: 14,
    //     createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    //   },
    // ];
    initialFeedback = []
  }

  // Batch presign private delivery assets so creator streams/views directly from Cloudflare R2
  mappedAssets = await presignDeliveryAssets(mappedAssets, services.storage, {
    workspaceId: fullDetails?.workspaceId ?? workspace.id,
    allowDownload: true,
  });

  // The custom cover is a private image of the delivery: signed like its files, and dropped
  // (back to the first file) when it isn't an image in this workspace's storage, as in the room.
  const storedCover = project.appearance?.coverThumbnailUrl ?? null;
  const signedCover = storedCover
    ? await presignPrivateMediaUrl(storedCover, services.storage, {
        workspaceId: fullDetails?.workspaceId ?? workspace.id,
      })
    : "";
  const appearance = project.appearance
    ? { ...project.appearance, coverThumbnailUrl: signedCover || null }
    : project.appearance;

  const canManageLinks = hasMinRole(membership?.role, "admin");

  return (
    <div className="w-full space-y-8 pb-16 animate-in fade-in duration-200 text-foreground selection:bg-primary selection:text-primary-foreground">
      <DeliveryNavHeader
        workspaceSlug={workspace.slug}
        shareToken={project.shareToken}
      />
      <DeliveryDetailClient
        workspace={workspace}
        portfolio={portfolio ? { id: portfolio.id, slug: portfolio.slug, title: portfolio.title } : null}
        project={{
          ...project,
          appearance,
          clientName,
          clientEmail,
          clientPhone,
          passcodeProtected: Boolean(project.passcodeHash),
        }}
        assets={mappedAssets}
        initialTotalAssetsCount={fullDetails?.totalAssetsCount ?? mappedAssets.length}
        initialApprovedCount={fullDetails?.approvedAssetsCount ?? mappedAssets.filter((a) => a.isApproved).length}
        initialHasMore={fullDetails?.hasMore ?? false}
        initialFeedback={initialFeedback}
        features={workspaceFeatures}
        whatsappAvailable={services.whatsapp.isConfigured()}
        canManageLinks={canManageLinks}
        linksEnabled={linksEnabled}
      />
    </div>
  );
}

