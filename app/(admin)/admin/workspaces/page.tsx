import { getServerServices } from "@/core/server";
import { Plan } from "@/core/entities/plan";
import { Subscription } from "@/core/entities/subscription";
import { Workspace } from "@/core/entities/workspace";
import { WorkspacesClient, AdminWorkspaceListItem } from "./workspaces-client";

export default async function AdminWorkspacesPage() {
  const services = await getServerServices();

  let mappedWorkspaces: AdminWorkspaceListItem[] = [];
  let availablePlans: { id: string; name: string; slug: string; priceCents: number }[] = [];

  try {
    const dbWorkspaces: Workspace[] = await services.workspace.listAllWorkspaces().catch(() => []);
    const subscriptions: Subscription[] = await services.subscription.listAllSubscriptions().catch(() => []);
    const plans: Plan[] = await services.subscription.listAllPlans().catch(() => []);

    availablePlans = plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceCents: p.priceCents,
    }));

    const planMap = new Map<string, Plan>(plans.map((p) => [p.id, p]));
    const subMap = new Map<string, Subscription>(subscriptions.map((s) => [s.workspaceId, s]));

    if (dbWorkspaces && dbWorkspaces.length > 0) {
      mappedWorkspaces = await Promise.all(
        dbWorkspaces.map(async (ws) => {
          const projects = await services.project.listWorkspaceProjects(ws.id).catch(() => []);
          const sub = subMap.get(ws.id);
          const plan = sub ? planMap.get(sub.planId) : null;
          const features = await services.workspace.getWorkspaceFeatures(ws.id).catch(() => ({} as any));

          const storageLimitGB = (features as any)?.storage_gb || 500;

          return {
            id: ws.id,
            brandName: ws.brandName,
            slug: ws.slug,
            ownerEmail: "creator@" + ws.slug + ".film",
            planName: plan?.name || "Starter",
            planId: plan?.id,
            subscriptionStatus: (sub?.status as any) || "trialing",
            storageUsedGB: ws.storageUsedBytes ? ws.storageUsedBytes / (1024 * 1024 * 1024) : 0,
            storageLimitGB,
            projectsCount: projects.length,
            createdAt: ws.createdAt,
            accountType: ws.accountType,
          };
        })
      );
    }
  } catch (err) {
    console.warn("Admin workspaces page error:", err);
  }


  const workspaces =
    mappedWorkspaces.length > 0
      ? mappedWorkspaces
      :[];

  if (availablePlans.length === 0) {
    availablePlans = [
      { id: "plan_starter", name: "Starter", slug: "starter", priceCents: 0 },
      { id: "plan_basic", name: "Basic", slug: "basic", priceCents: 1200 },
      { id: "plan_pro", name: "Pro", slug: "pro", priceCents: 2900 },
      { id: "plan_studio", name: "Studio", slug: "studio", priceCents: 6900 },
    ];
  }

  return <WorkspacesClient workspaces={workspaces} plans={availablePlans} />;
}
