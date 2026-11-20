import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { DeliveriesClient, DeliveryProjectItem } from "./deliveries-client";
import DeliveriesLoading from "./loading";

async function DeliveriesFeed({
  workspace,
}: {
  workspace: { id: string; brandName: string; slug: string; accountType?: string };
}) {
  const services = await getServerServices();

  // 1. Fetch real workspace deliveries and features in parallel (single roundtrip)
  const [deliverySummaries, workspaceFeatures] = await Promise.all([
    services.delivery.listWorkspaceDeliveriesSummary(workspace.id),
    services.subscription.getFeatures(workspace.id),
  ]);

  // 2. Map deliveries synchronously in memory with zero N+1 database roundtrips
  const deliveries: DeliveryProjectItem[] = deliverySummaries.map((item) => {
    let durationStr = "01:00";
    if (item.activeDurationSeconds && item.activeDurationSeconds > 0) {
      const totalSec = Math.round(item.activeDurationSeconds);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      durationStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return {
      id: item.id,
      title: item.title,
      description: item.description ?? null,
      clientId: item.clientId ?? null,
      clientName: item.clientName || "Private Client",
      version: item.activeVersionNumber ? `v${item.activeVersionNumber}_DirectorCut` : "v1_Master",
      duration: durationStr,
      status: item.status,
      shareToken: item.shareToken,
      passcodeProtected: item.passcodeProtected,
      downloadsAllowed: item.isDownloadAllowed,
      assetsCount: item.assetsCount,
      commentsCount: item.commentsCount,
      openNotesCount: item.openNotesCount ?? 0,
      createdAt: item.createdAt,
      lastActivityAt: item.lastActivityAt || item.updatedAt || item.createdAt,
      lastNoteAt: item.lastNoteAt ?? null,
      // Left undefined when unknown, so the card doesn't claim "Not opened yet".
      lastOpenedAt: item.lastOpenedAt,
      lastDownloadedAt: item.lastDownloadedAt,
      approvedAt: item.approvedAt ?? null,
      approvedByName: item.approvedByName ?? null,
    };
  });

  return (
    <DeliveriesClient
      workspace={workspace}
      deliveries={deliveries}
      features={workspaceFeatures}
      // Relative times ("2 h ago") count from here in the server render and in the browser.
      renderedAt={Date.now()}
    />
  );
}

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

  return (
    <Suspense fallback={<DeliveriesLoading />}>
      <DeliveriesFeed workspace={workspace} />
    </Suspense>
  );
}
