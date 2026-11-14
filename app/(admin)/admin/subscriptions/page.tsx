import { requirePlatformAdminPage } from "@/core/admin/context";
import { AdminLoadError, AdminPageHeader } from "../../_components/page-header";
import { attempt } from "../../_lib/data";
import { formatPlanPrice } from "../../_lib/format";
import { SubscriptionsClient, type AdminPlanItem, type AdminSubscriptionListItem } from "./subscriptions-client";

export const metadata = { title: "Plans & subscriptions" };

export default async function AdminSubscriptionsPage() {
  const admin = await requirePlatformAdminPage("/admin/subscriptions");

  // Three queries on the service role, so every workspace's name is known.
  const loaded = await attempt(() =>
    Promise.all([
      admin.services.subscription.listAllPlans(),
      admin.services.subscription.listAllSubscriptions(),
      admin.services.workspace.listAllWorkspaces(),
    ])
  );
  if (!loaded.ok) {
    return (
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader title="Plans & subscriptions" />
        <AdminLoadError what="plans and subscriptions" error={loaded.error} />
      </div>
    );
  }
  const [plans, subscriptions, workspaces] = loaded.value;

  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  // Subscribers: active and trialing subscriptions on the plan.
  const subscriberCounts = new Map<string, number>();
  for (const subscription of subscriptions) {
    if (subscription.status === "active" || subscription.status === "trialing") {
      subscriberCounts.set(subscription.planId, (subscriberCounts.get(subscription.planId) ?? 0) + 1);
    }
  }

  const planItems: AdminPlanItem[] = plans.map((plan) => {
    const features = plan.features || {};
    const storageGB = typeof features.storage_gb === "number" ? features.storage_gb : 0;
    const links =
      features.client_links === -1
        ? "Unlimited links"
        : typeof features.client_links === "number"
          ? `${features.client_links} active links`
          : "Links not set";
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      priceCents: plan.priceCents,
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
      activeSubscribersCount: subscriberCounts.get(plan.id) ?? 0,
      featuresSummary: `${storageGB ? `${storageGB} GB storage` : "Storage not set"} · ${links}${features.whatsapp_delivery ? " · WhatsApp delivery" : ""}`,
      storageGB,
      stripePriceId: plan.stripePriceId,
    };
  });

  const subscriptionItems: AdminSubscriptionListItem[] = subscriptions.map((subscription) => {
    const workspace = workspaceById.get(subscription.workspaceId);
    const plan = planById.get(subscription.planId);
    return {
      id: subscription.id,
      workspaceId: subscription.workspaceId,
      workspaceName: workspace?.brandName ?? "Deleted workspace",
      workspaceSlug: workspace?.slug ?? "",
      planName: plan?.name ?? "Unknown plan",
      status: subscription.status,
      currency: subscription.currency,
      priceFormatted: plan ? formatPlanPrice(plan.priceCents, plan.currency, plan.billingInterval) : "—",
      createdAt: subscription.createdAt,
    };
  });

  return <SubscriptionsClient plans={planItems} subscriptions={subscriptionItems} />;
}
