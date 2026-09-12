import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import { NewWorkspaceClient } from "./new-workspace-client";

export default async function NewWorkspacePage() {
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/new-workspace");
  }

  // Ensure user has at least their personal workspace
  let userWorkspaces = await services.workspace.getUserWorkspaces(user.id);
  if (userWorkspaces.length === 0) {
    const personal = await services.workspace.getOrCreateWorkspace(
      user.id,
      user.user_metadata?.full_name || "My Studio"
    );
    userWorkspaces = [personal];
  }

  const primaryWorkspace = userWorkspaces.find((w) => w.ownerId === user.id) || userWorkspaces[0];

  const [eligibility, availablePlans, currentPlan] = await Promise.all([
    services.workspace.checkTeamWorkspaceEligibility(user.id),
    services.subscription.listAvailablePlans(),
    services.subscription.getCurrentPlan(primaryWorkspace.id),
  ]);

  const displayPlans = availablePlans
    .filter((p) => p.isActive && p.slug !== "test" && p.slug !== "test3")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceCents: p.priceCents,
      currency: p.currency,
      features: p.features,
    }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NewWorkspaceClient
        isEligible={eligibility.eligible}
        maxSeats={eligibility.maxSeats}
        currentPlanName={currentPlan?.name || "Starter"}
        primaryWorkspaceId={primaryWorkspace.id}
        primaryWorkspaceSlug={primaryWorkspace.slug}
        plans={displayPlans}
        userWorkspaces={userWorkspaces.map((w) => ({
          id: w.id,
          brandName: w.brandName,
          slug: w.slug,
          accountType: w.accountType,
        }))}
      />
    </div>
  );
}
