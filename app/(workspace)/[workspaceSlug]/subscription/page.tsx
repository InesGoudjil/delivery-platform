import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { PageContainer } from "@/components/ui/page-container";
import { SubscriptionHeader } from "./_components/subscription-header";
import { SubscriptionClient } from "./_components/subscription-client";

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/subscription`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  // Fetch real subscription, plan, and invoice details via core services
  const [currentPlan, subscription, availablePlans, realInvoices] = await Promise.all([
    services.subscription.getCurrentPlan(workspace.id),
    services.subscription.getSubscription(workspace.id),
    services.subscription.listAvailablePlans(),
    services.subscription.listInvoices(workspace.id),
  ]);

  const currentPlanName = currentPlan?.name || "Starter";
  const currentPlanSlug = currentPlan?.slug || "starter";
  const subStatus = subscription?.status || "active";
  const periodEnd = subscription?.currentPeriodEnd || null;

  const mappedPlans = availablePlans.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.priceCents,
    currency: p.currency,
    billingInterval: p.billingInterval,
    stripePriceId: p.stripePriceId,
    features: p.features,
  }));

  return (
    <PageContainer maxWidth="7xl" className="animate-in fade-in duration-200">
      <SubscriptionHeader workspaceName={workspace.brandName} />

      <SubscriptionClient
        workspaceId={workspace.id}
        currentPlanSlug={currentPlanSlug}
        currentPlanName={currentPlanName}
        subStatus={subStatus}
        periodEnd={periodEnd}
        plans={mappedPlans}
        invoices={realInvoices}
        currentPlanFeatures={currentPlan?.features || {}}
      />
    </PageContainer>
  );
}
