import LandingPage from "@/components/landing/LandingPage";
import { getServerAdminServices, getServerServices } from "@/core/server";
import { isDemoRoomLive, loadDemoRoom } from "@/lib/client-room/demo-room";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ page: "Home" });

export default async function Home(props: {
  searchParams?: Promise<{ ref?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const referralCode = searchParams?.ref;

  try {
    // Fetch authentication, workspace, and subscription plans via Core Domain Services
    const services = await getServerServices();
    const [{ user, workspace }, demoHref] = await Promise.all([
      services.auth.getCurrentSessionData(),
      demoRoomHref(),
    ]);

    let availablePlans: any[] = [];
    try {
      availablePlans = await services.subscription.listAvailablePlans();
    } catch (err: any) {
      log.warn({ err }, "Could not fetch plans from DB");
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
        demoHref={demoHref}
      />
    );
  } catch {
    return <LandingPage user={null} workspace={null} referralCode={referralCode} plans={[]} />;
  }
}

/**
 * "/demo" when an admin put the demo room on the landing page (Admin -> Site settings) and
 * visitors can open it. Otherwise no demo link at all.
 */
async function demoRoomHref(): Promise<string | undefined> {
  try {
    const demo = await loadDemoRoom(await getServerAdminServices());
    return isDemoRoomLive(demo) ? "/demo" : undefined;
  } catch (err) {
    log.warn({ err }, "Could not check the demo room");
    return undefined;
  }
}
