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

  // 1. Fetch deliveries, workspace clients, and plan features in parallel
  const [dbDeliveries, workspaceClients, workspaceFeatures] = await Promise.all([
    services.delivery.listWorkspaceDeliveries(workspace.id),
    services.client.listClients(workspace.id),
    services.subscription.getFeatures(workspace.id),
  ]);

  const clientsById = new Map(workspaceClients.map((c) => [c.id, c]));

  // 2. Batch-fetch assets, active versions, and feedback counts across all deliveries
  const deliveryIds = dbDeliveries.map((d) => d.id);
  const allDeliveryAssets =
    deliveryIds.length > 0
      ? await services.asset.listAssetsByDeliveryIds(deliveryIds)
      : [];

  const assetsByDeliveryId = new Map<string, typeof allDeliveryAssets>();
  for (const asset of allDeliveryAssets) {
    if (!asset.deliveryId) continue;
    const list = assetsByDeliveryId.get(asset.deliveryId) || [];
    list.push(asset);
    assetsByDeliveryId.set(asset.deliveryId, list);
  }

  const firstAssetIds: string[] = [];
  for (const delivery of dbDeliveries) {
    const assets = assetsByDeliveryId.get(delivery.id);
    if (assets && assets.length > 0) {
      firstAssetIds.push(assets[0].id);
    }
  }

  const activeVersionByAssetId =
    firstAssetIds.length > 0
      ? await services.asset.getActiveVersionsByAssetIds(firstAssetIds)
      : new Map();

  const activeVersionIds = Array.from(activeVersionByAssetId.values()).map((v) => v.id);
  let feedbackCountByVersionId = new Map<string, number>();
  if (activeVersionIds.length > 0) {
    try {
      const allFeedback = await services.feedback.listFeedbackForVersions(activeVersionIds);
      for (const fb of allFeedback) {
        feedbackCountByVersionId.set(
          fb.assetVersionId,
          (feedbackCountByVersionId.get(fb.assetVersionId) || 0) + 1
        );
      }
    } catch {
      feedbackCountByVersionId = new Map();
    }
  }

  const nowMs = Date.now();
  const mappedDbDeliveries: DeliveryProjectItem[] = dbDeliveries.map((delivery) => {
    const assets = assetsByDeliveryId.get(delivery.id) || [];
    const activeVersion =
      assets.length > 0 ? activeVersionByAssetId.get(assets[0].id) ?? null : null;

    let clientName = (delivery as { clientName?: string }).clientName || "Private Client";
    if (delivery.clientId) {
      const client = clientsById.get(delivery.clientId);
      if (client) clientName = client.name;
    }

    const commentsCount = activeVersion
      ? feedbackCountByVersionId.get(activeVersion.id) || 0
      : 0;

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
    const diffMins = Math.floor((nowMs - updatedAt.getTime()) / (1000 * 60));
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
      assetsCount: assets.length,
      commentsCount,
      lastActivity,
    };
  });

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
