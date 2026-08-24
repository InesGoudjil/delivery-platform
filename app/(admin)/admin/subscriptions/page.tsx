import { getServerServices } from "@/core/server";
import { Plan } from "@/core/entities/plan";
import { Subscription } from "@/core/entities/subscription";
import { Workspace } from "@/core/entities/workspace";
import { SubscriptionsClient, AdminPlanItem, AdminSubscriptionListItem } from "./subscriptions-client";

export default async function AdminSubscriptionsPage() {
  const services = await getServerServices();

  let mappedPlans: AdminPlanItem[] = [];
  let mappedSubscriptions: AdminSubscriptionListItem[] = [];

  try {
    const plans: Plan[] = await services.subscription.listAllPlans().catch(() => []);
    const subscriptions: Subscription[] = await services.subscription.listAllSubscriptions().catch(() => []);
    const workspaces: Workspace[] = await services.workspace.listAllWorkspaces().catch(() => []);

    const planMap = new Map<string, Plan>(plans.map((p) => [p.id, p]));
    const wsMap = new Map<string, Workspace>(workspaces.map((w) => [w.id, w]));

    // Count subscribers per plan
    const subscriberCounts = new Map<string, number>();
    subscriptions.forEach((s) => {
      subscriberCounts.set(s.planId, (subscriberCounts.get(s.planId) || 0) + 1);
    });

    mappedPlans = plans.map((p) => {
      const features = p.features || {};
      const storageGB = features.storage_gb ?? 500;
      const linksText = features.client_links === -1 ? "Unlimited Links" : `${features.client_links || 1} Active Links`;
      const summary = `${storageGB} GB Storage · ${linksText}${features.whatsapp_delivery ? " · WhatsApp Delivery" : ""}`;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceCents: p.priceCents,
        currency: p.currency,
        billingInterval: p.billingInterval,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
        activeSubscribersCount: subscriberCounts.get(p.id) || 0,
        featuresSummary: summary,
        storageGB,
        stripePriceId: p.stripePriceId,
      };
    });

    mappedSubscriptions = subscriptions.map((s) => {
      const ws = wsMap.get(s.workspaceId);
      const plan = planMap.get(s.planId);
      const priceVal = plan ? plan.priceCents / 100 : 0;

      return {
        id: s.id,
        workspaceId: s.workspaceId,
        workspaceName: ws?.brandName || "Unknown Studio",
        workspaceSlug: ws?.slug || "studio",
        planName: plan?.name || "Starter",
        status: s.status as any,
        currency: s.currency,
        priceFormatted: priceVal > 0 ? `$${priceVal.toFixed(0)}/mo` : "$0 (Free)",
        createdAt: s.createdAt,
      };
    });
  } catch (err) {
    console.warn("Error fetching admin subscriptions page:", err);
  }



  const plans = mappedPlans.length > 0 ? mappedPlans : [] ;
  const subscriptions =
    mappedSubscriptions.length > 0
      ? mappedSubscriptions
      : [];

  return <SubscriptionsClient plans={plans} subscriptions={subscriptions} />;
}
