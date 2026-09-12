import { redirect } from "next/navigation";
import { getServerServices, getServerAdminServices } from "@/core/server";
import { PageContainer } from "@/components/ui/page-container";
import { SubscriptionHeader } from "./_components/subscription-header";
import { SubscriptionClient } from "./_components/subscription-client";

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ billing?: string; session_id?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { billing, session_id } = await searchParams;

  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/${workspaceSlug}/subscription`);
  }

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  // 1. If returning from a successful Stripe checkout session, synchronize immediately
  if (billing === "success" && session_id) {
    try {
      const adminServices = await getServerAdminServices();
      await adminServices.stripe.syncCheckoutSession(session_id, adminServices.subscription);
    } catch (err: any) {
      console.warn("[SubscriptionPage] Checkout session sync error:", err.message);
    }
  }

  // 2. Determine member / owner permission to manage billing
  const isOwner = workspace.ownerId === user.id;
  const member = await services.member.getMember(workspace.id, user.id);
  const canManageBilling = isOwner || member?.role === "owner" || member?.role === "admin";

  // 3. Fetch real subscription, plan, and invoice details via core services
  const [currentPlan, subscription, availablePlans, realInvoices, workspaceFeatures] = await Promise.all([
    services.subscription.getCurrentPlan(workspace.id),
    services.subscription.getSubscription(workspace.id),
    services.subscription.listAvailablePlans(),
    services.subscription.listInvoices(workspace.id),
    services.subscription.getFeatures(workspace.id),
  ]);

  const currentPlanName = currentPlan?.name || "Starter";
  const currentPlanSlug = currentPlan?.slug || "starter";
  const subStatus = subscription?.status || "active";
  const periodEnd = subscription?.currentPeriodEnd || null;

  const hasBillingHistory = Boolean(
    subscription?.paymentProviderCustId &&
    !subscription.paymentProviderCustId.startsWith("cus_test_mock") &&
    !subscription.paymentProviderCustId.startsWith("cus_mock")
  );

  // Filter out any scratch test plans from comparison grid and sort by tier order
  const displayPlans = availablePlans
    .filter((p) => p.isActive && p.slug !== "test" && p.slug !== "test3")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
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
        workspaceSlug={workspace.slug}
        currentPlanSlug={currentPlanSlug}
        currentPlanName={currentPlanName}
        subStatus={subStatus}
        periodEnd={periodEnd}
        plans={displayPlans}
        invoices={realInvoices}
        workspaceFeatures={workspaceFeatures}
        storageUsedBytes={workspace.storageUsedBytes || 0}
        canManageBilling={canManageBilling}
        hasBillingHistory={hasBillingHistory}
        initialBillingStatus={billing === "success" ? "success" : billing === "cancel" ? "cancel" : null}
      />
    </PageContainer>
  );
}
