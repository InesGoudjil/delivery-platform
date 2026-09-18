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

  // 1. Fetch real workspace deliveries
  const dbDeliveries = await services.delivery.listWorkspaceDeliveries(workspace.id);

  // 2. Enrich with assets, versions, clients, and comments
  const mappedDbDeliveries: DeliveryProjectItem[] = await Promise.all(
    dbDeliveries.map(async (delivery) => {
      const assets = await services.asset.listAssets(delivery.id);
      const activeVersion =
        assets.length > 0
          ? await services.asset.getActiveVersion(assets[0].id)
          : null;

      let clientName = (delivery as { clientName?: string }).clientName || "Private Client";
      if (delivery.clientId) {
        const client = await services.client.getClientById(delivery.clientId);
        if (client) clientName = client.name;
      }

      // Count comments for active version
      let commentsCount = 0;
      if (activeVersion) {
        try {
          const threads = await services.feedback.getThreadedFeedback(activeVersion.id);
          commentsCount = threads.length;
        } catch {
          commentsCount = 0;
        }
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
      const updatedAt = new Date(delivery.updatedAt || delivery.createdAt);
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
        id: delivery.id,
        title: delivery.title,
        clientName,
        version: activeVersion ? `v${activeVersion.versionNumber}_DirectorCut` : "v1_Master",
        duration: durationStr,
        status: (delivery.status as any) || "in_review",
        shareToken: delivery.shareToken,
        passcodeProtected: Boolean(delivery.passcodeHash),
        downloadsAllowed: Boolean(delivery.isDownloadAllowed),
        commentsCount,
        lastActivity,
      };
    })
  );



  const workspaceFeatures = await services.subscription.getFeatures(workspace.id);

  const deliveries =
    mappedDbDeliveries.length > 0
      ? [...mappedDbDeliveries]
      : [];

  return (
    <DeliveriesClient
      workspace={workspace}
      deliveries={deliveries}
      features={workspaceFeatures}
    />
  );
}
