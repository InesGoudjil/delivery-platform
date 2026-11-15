import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PricingSection, resolvePricingPlans, type PricingPlanItem } from "@/components/landing/PricingSection";
import { PlanComparisonGrid, type PlanItem } from "@/app/(workspace)/[workspaceSlug]/subscription/_components/plan-comparison-grid";

/**
 * The landing page pricing and the workspace subscription page show real yearly plans (a
 * tier's `-yearly` twin) and nothing yearly when there are none: no toggle, no made-up discount.
 */

const plan = (slug: string, name: string, priceCents: number, billingInterval: "month" | "year", features = {}): PlanItem => ({
  id: `id-${slug}`,
  name,
  slug,
  priceCents,
  currency: "USD",
  billingInterval,
  stripePriceId: `price_${slug}`,
  features,
});

const monthlyPlans = [
  plan("starter", "Starter", 0, "month"),
  plan("basic", "Basic", 1200, "month"),
  plan("pro", "Pro", 2900, "month", { silo_archive: true }),
  plan("studio", "Studio", 6900, "month", { silo_archive: true }),
];
const withYearly = [
  ...monthlyPlans,
  plan("pro-yearly", "Pro", 26100, "year", { silo_archive: true }),
  plan("studio-yearly", "Studio", 62100, "year", { silo_archive: true }),
];

const renderLanding = (plans: PricingPlanItem[]) =>
  renderToStaticMarkup(<PricingSection plans={resolvePricingPlans(plans)} />);

describe("landing page pricing", () => {
  it("shows monthly prices and no yearly toggle when no plan is sold yearly", () => {
    const html = renderLanding(monthlyPlans);
    expect(html).not.toContain("Yearly");
    expect(html).not.toContain("Save ");
    expect(html).toContain("$29");
    expect(html).toContain("billed monthly");
  });

  it("opens on yearly when yearly plans exist, with the real yearly price", () => {
    const html = renderLanding(withYearly);
    expect(html).toContain("Save 25%");
    expect(html).toContain("$21.75");
    expect(html).toContain("$261 billed yearly · save 25%");
    // Basic has no yearly plan, so it stays monthly rather than showing a made-up discount.
    expect(html).toContain("$12");
  });

  it("lists The Silo under Pro when Pro includes it, not again under Studio", () => {
    const html = renderLanding(monthlyPlans);
    expect(html.match(/The Silo secure cold archive/g)).toHaveLength(1);
    const proCard = html.slice(html.indexOf("Everything in Basic"), html.indexOf("Everything in Pro"));
    expect(proCard).toContain("The Silo secure cold archive");
  });

  it("lists The Silo under Studio when only Studio includes it", () => {
    const plans = monthlyPlans.map((p) => (p.slug === "pro" ? { ...p, features: {} } : p));
    const html = renderLanding(plans);
    expect(html.match(/The Silo secure cold archive/g)).toHaveLength(1);
    expect(html.slice(html.indexOf("Everything in Pro"))).toContain("The Silo secure cold archive");
  });
});

const renderGrid = (props: Partial<React.ComponentProps<typeof PlanComparisonGrid>>) =>
  renderToStaticMarkup(
    <PlanComparisonGrid
      currentPlanSlug="starter"
      plans={withYearly}
      onCheckout={async () => {}}
      loadingPlanId={null}
      {...props}
    />
  );

describe("subscription page plans", () => {
  it("has no yearly toggle or discount banner without yearly plans", () => {
    const html = renderGrid({ plans: monthlyPlans });
    expect(html).not.toContain("Yearly");
    expect(html).not.toContain("Save 20%");
    expect(html).toContain("Billed monthly");
  });

  it("opens on the plan picked before signup, marked and on its interval", () => {
    const html = renderGrid({ chosenPlanSlug: "pro-yearly" });
    expect(html).toContain("Your pick");
    expect(html).toContain('id="plan-pro-yearly"');
    expect(html).toContain("$261 billed yearly · save 25%");
  });

  it("opens on monthly for a workspace paying monthly", () => {
    const html = renderGrid({ currentPlanSlug: "pro" });
    expect(html).toContain('id="plan-pro"');
    expect(html).not.toContain('id="plan-pro-yearly"');
  });

  it("doesn't start a second Stripe subscription to switch a paid plan to yearly", () => {
    const paying = renderGrid({ currentPlanSlug: "pro", hasBillingHistory: true, chosenPlanSlug: "pro-yearly" });
    expect(paying).toContain("Contact us to switch to yearly");
    expect(paying).not.toContain("Switch to yearly billing");

    // No Stripe subscription yet (an admin-assigned plan, say): checkout is the way to pay.
    const assigned = renderGrid({ currentPlanSlug: "pro", hasBillingHistory: false, chosenPlanSlug: "pro-yearly" });
    expect(assigned).toContain("Switch to yearly billing");
  });
});
