import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import {
  DeliveryDetailClient,
  AssetVersionItem,
  FeedbackItem,
} from "./delivery-detail-client";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/deliveries/${projectId}`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  // 1. Fetch full delivery details (delivery, client, assets, versions, feedback)
  const fullDetails = await services.delivery.getDeliveryWithFullDetails(projectId);

  // 2. Fetch or prepare workspace portfolio for 1-click publishing
  const portfolio = await services.portfolio.getOrCreatePortfolio(
    workspace.id,
    workspace.brandName || "Cinematic Portfolio",
    workspace.slug
  );

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
      notifyOnDownload: false,
      isWatermarked: false,
      approvedAt: null,
      approvedByName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assets: [],
    } as any;
  }

  // 3. Resolve client name
  let clientName = project?.client?.name || (project as any).clientName || "Private Client";
  if (!clientName && project.clientId) {
    const client = await services.client.getClientById(project.clientId);
    if (client) clientName = client.name;
  }

  // 4. Map assets and feedback
  let mappedAssets: Array<{
    id: string;
    title: string;
    type: string;
    aspectRatio?: string;
    isApproved?: boolean;
    versions: AssetVersionItem[];
    activeVersion?: AssetVersionItem | null;
  }> = [];

  let initialFeedback: FeedbackItem[] = [];

  if (fullDetails && fullDetails.assets.length > 0) {
    mappedAssets = fullDetails.assets.map((a) => {
      const mappedVersions: AssetVersionItem[] = a.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        rawFileUrl: v.rawFileUrl,
        hlsManifestUrl: v.hlsManifestUrl,
        thumbnailUrl: v.thumbnailUrl || "/images/hero.jpg",
        durationSeconds: v.durationSeconds,
        fileSizeBytes: v.fileSizeBytes,
        transcodingStatus: v.transcodingStatus,
        isActiveVersion: v.isActiveVersion,
        createdAt: v.createdAt,
      }));

      const activeVersion =
        mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        aspectRatio: a.aspectRatio,
        isApproved: a.isApproved,
        versions: mappedVersions,
        activeVersion,
      };
    });

    const primaryAsset = fullDetails.assets[0];
    if (primaryAsset?.feedback && primaryAsset.feedback.length > 0) {
      initialFeedback = primaryAsset.feedback.map((f) => ({
        id: f.id,
        authorName: f.authorName,
        commentText: f.commentText,
        timestampSeconds: f.timestampSeconds,
        createdAt: f.createdAt,
        isResolved: f.isResolved,
      }));
    }
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
            hlsManifestUrl: v.hlsManifestUrl,
            thumbnailUrl: v.thumbnailUrl || "/images/hero.jpg",
            durationSeconds: v.durationSeconds,
            fileSizeBytes: v.fileSizeBytes,
            transcodingStatus: v.transcodingStatus,
            isActiveVersion: v.isActiveVersion,
            createdAt: v.createdAt,
          }));

          const activeVersion = mappedVersions.find((v) => v.isActiveVersion) || mappedVersions[0] || null;

          return {
            id: a.id,
            title: a.title,
            type: a.type,
            aspectRatio: a.aspectRatio,
            isApproved: a.isApproved,
            versions: mappedVersions,
            activeVersion,
          };
        })
      );

      const primaryActiveVersion = mappedAssets[0]?.activeVersion;
      if (primaryActiveVersion) {
        const threads = await services.feedback.getThreadedFeedback(primaryActiveVersion.id);
        initialFeedback = threads.map((f) => ({
          id: f.id,
          authorName: f.authorName,
          commentText: f.commentText,
          timestampSeconds: f.timestampSeconds,
          createdAt: f.createdAt,
          isResolved: f.isResolved,
        }));
      }
    }
  }

  // If no feedback yet, provide sample cues
  if (initialFeedback.length === 0) {
    initialFeedback = [
      {
        id: "fb_1",
        authorName: clientName,
        commentText: "Love this cut! Can we make the intro sequence a touch faster?",
        timestampSeconds: 12,
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
      {
        id: "fb_2",
        authorName: workspace.brandName || "Filmmaker",
        commentText: "On it — adjusting speed ramp on the sushi prep shot.",
        timestampSeconds: 14,
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
    ];
  }

  return (
    <DeliveryDetailClient
      workspace={workspace}
      portfolio={portfolio ? { id: portfolio.id, slug: portfolio.slug, title: portfolio.title } : null}
      project={{
        ...project,
        clientName,
        passcodeProtected: Boolean(project.passcodeHash),
      }}
      assets={mappedAssets}
      initialFeedback={initialFeedback}
    />
  );
}

