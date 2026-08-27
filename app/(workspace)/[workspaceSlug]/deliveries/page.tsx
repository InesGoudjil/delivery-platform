import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { DeliveriesClient, DeliveryProjectItem } from "./deliveries-client";

export default async function DeliveriesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/deliveries`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  // 1. Fetch real workspace projects
  const dbProjects = await services.project.listWorkspaceProjects(workspace.id);

  console.log("projects",dbProjects)

  // 2. Enrich with assets, versions, and clients
  const mappedDbDeliveries: DeliveryProjectItem[] = await Promise.all(
    dbProjects.map(async (project) => {
      const assets = await services.asset.listAssets(project.id);
      const activeVersion =
        assets.length > 0
          ? await services.asset.getActiveVersion(assets[0].id)
          : null;

      let clientName = (project as { clientName?: string }).clientName || "Private Client";
      if (project.clientId) {
        const client = await services.client.getClientById(project.clientId);
        if (client) clientName = client.name;
      }

      // Format duration (e.g. 47 -> 00:47)
      let durationStr = "01:00";
      if (activeVersion?.durationSeconds) {
        const totalSec = Math.round(activeVersion.durationSeconds);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        durationStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      }

      // Calculate relative time
      const updatedAt = new Date(project.updatedAt || project.createdAt);
      const diffMins = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60));
      let lastActivity = "Just now";
      if (diffMins > 60 * 24) {
        lastActivity = `${Math.floor(diffMins / (60 * 24))} days ago`;
      } else if (diffMins > 60) {
        lastActivity = `${Math.floor(diffMins / 60)} hours ago`;
      } else if (diffMins > 0) {
        lastActivity = `${diffMins} mins ago`;
      }

      return {
        id: project.id,
        title: project.title,
        clientName,
        version: activeVersion ? `v${activeVersion.versionNumber}_DirectorCut` : "v1_Master",
        duration: durationStr,
        status: (project.status as any) || "in_review",
        shareToken: project.shareToken,
        passcodeProtected: Boolean(project.passcodeHash),
        downloadsAllowed: Boolean(project.isDownloadAllowed),
        commentsCount: 0,
        lastActivity,
      };
    })
  );

  // Default Cinematic Showcase delivery items if database has no projects yet
  const defaultDeliveries: DeliveryProjectItem[] = [
    {
      id: "del_1",
      title: "Omakase Counter Launch Film",
      clientName: "Lost in Tokyo Group",
      version: "v3_DirectorCut_4K",
      duration: "00:47",
      status: "in_review",
      shareToken: "token-1",
      passcodeProtected: true,
      downloadsAllowed: true,
      commentsCount: 3,
      lastActivity: "12 mins ago",
    },
    {
      id: "del_2",
      title: "Aisha & Omar — Wedding Teaser",
      clientName: "Private Client",
      version: "v2_ColorFinal",
      duration: "03:12",
      status: "approved",
      shareToken: "token-2",
      passcodeProtected: false,
      downloadsAllowed: true,
      commentsCount: 0,
      lastActivity: "2 hours ago",
    },
    {
      id: "del_3",
      title: "Mercedes GT3 Desert Spec Reel",
      clientName: "Prestige Rentals Dubai",
      version: "v1_RoughCut",
      duration: "01:20",
      status: "in_review",
      shareToken: "token-3",
      passcodeProtected: true,
      downloadsAllowed: false,
      commentsCount: 7,
      lastActivity: "Yesterday",
    },
    {
      id: "del_4",
      title: "Clean Performance Launch Reel",
      clientName: "Clean Snacks UAE",
      version: "v4_MasterDelivery",
      duration: "00:30",
      status: "approved",
      shareToken: "token-4",
      passcodeProtected: false,
      downloadsAllowed: true,
      commentsCount: 1,
      lastActivity: "3 days ago",
    },
  ];

  const deliveries =
    mappedDbDeliveries.length > 0
      ? [...mappedDbDeliveries]
      : [];

  return (
    <DeliveriesClient
      workspace={workspace}
      deliveries={deliveries}
    />
  );
}
