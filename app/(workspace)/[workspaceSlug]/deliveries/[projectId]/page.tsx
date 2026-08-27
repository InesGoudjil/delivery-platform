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

  // 1. Fetch real project from database
  let project = await services.project.getProjectById(projectId);

  // If not found by ID directly, attempt finding by share token
  if (!project) {
    project = await services.project.getProjectByShareToken(projectId);
  }

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
      title: demo.title,
      description: "47-second promotional cut for launch event",
      shareToken: `token-${projectId}`,
      passcodeHash: null,
      status: "in_review",
      isDownloadAllowed: true,
      notifyOnDownload: false,
      approvedAt: null,
      approvedByName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 2. Fetch client information
  let clientName = (project as { clientName?: string }).clientName || "Private Client";
  if (project.clientId) {
    const client = await services.client.getClientById(project.clientId);
    if (client) clientName = client.name;
  }

  // 3. Fetch real assets and versions
  const dbAssets = await services.asset.listAssets(project.id);

  let mappedAssets: Array<{
    id: string;
    title: string;
    type: string;
    versions: AssetVersionItem[];
    activeVersion?: AssetVersionItem | null;
  }> = [];

  let initialFeedback: FeedbackItem[] = [];

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
          versions: mappedVersions,
          activeVersion,
        };
      })
    );

    // Fetch feedback comments from active version
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

  // If fresh showcase fallback, provide sample comments
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
