import LandingPage from "@/components/landing/LandingPage";
import { getServerServices } from "@/core/server";

export default async function Home(props: {
  searchParams?: Promise<{ ref?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const referralCode = searchParams?.ref;

  try {
    // Fetch authentication, workspace, and subscription plans via Core Domain Services
    const services = await getServerServices();
    const { user, workspace } = await services.auth.getCurrentSessionData();

    let availablePlans: any[] = [];
    try {
      availablePlans = await services.subscription.listAvailablePlans();
    } catch (err: any) {
      console.warn("[Home Page] Could not fetch plans from DB:", err?.message || err);
    }

    const displayPlans = (availablePlans || [])
      .filter((p) => p.isActive && p.slug !== "test" && p.slug !== "test3")
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceCents: p.priceCents,
        currency: p.currency,
        billingInterval: p.billingInterval,
        sortOrder: p.sortOrder,
        stripePriceId: p.stripePriceId,
        features: p.features,
      }));

    return (
      <LandingPage
        user={user}
        workspace={workspace}
        referralCode={referralCode}
        plans={displayPlans}
      />
    );
  } catch {
    return <LandingPage user={null} workspace={null} referralCode={referralCode} plans={[]} />;
  }
}

