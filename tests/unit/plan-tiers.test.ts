import { describe, it, expect } from "vitest";
import {
  groupPlanTiers,
  planForInterval,
  planTier,
  yearlyPlanSlug,
  yearlySavingsLabel,
  yearlySavingsPercent,
} from "@/core/entities/plan";
import { formatUsd, monthlyPriceCents } from "@/lib/billing/price";

/**
 * Yearly billing: each paid tier can have a yearly twin plan (`pro` + `pro-yearly`). The
 * pricing pages pair them; checkout gets whichever plan is picked.
 */

const starter = { slug: "starter", priceCents: 0, billingInterval: "month" };
const basic = { slug: "basic", priceCents: 1200, billingInterval: "month" };
const pro = { slug: "pro", priceCents: 2900, billingInterval: "month" };
const proYearly = { slug: "pro-yearly", priceCents: 26100, billingInterval: "year" };
const studio = { slug: "studio", priceCents: 6900, billingInterval: "month" };
const studioYearly = { slug: "studio-yearly", priceCents: 62100, billingInterval: "year" };

describe("planTier / yearlyPlanSlug", () => {
  it("names the tier the same way whichever way it's billed", () => {
    expect(planTier("pro")).toBe("pro");
    expect(planTier("pro-yearly")).toBe("pro");
    expect(yearlyPlanSlug("pro")).toBe("pro-yearly");
    expect(yearlyPlanSlug("pro-yearly")).toBe("pro-yearly");
  });
});

describe("groupPlanTiers", () => {
  it("pairs each monthly plan with its yearly twin, in the monthly plans' order", () => {
    const tiers = groupPlanTiers([studioYearly, starter, basic, pro, proYearly, studio]);
    expect(tiers.map((t) => [t.tier, t.monthly.slug, t.yearly?.slug ?? null])).toEqual([
      ["starter", "starter", null],
      ["basic", "basic", null],
      ["pro", "pro", "pro-yearly"],
      ["studio", "studio", "studio-yearly"],
    ]);
  });

  it("leaves out a yearly plan whose monthly plan is gone", () => {
    expect(groupPlanTiers([starter, proYearly]).map((t) => t.tier)).toEqual(["starter"]);
  });

  it("doesn't pair a plan that only looks yearly by its slug", () => {
    const oddMonthly = { slug: "odd-yearly", priceCents: 500, billingInterval: "month" };
    expect(groupPlanTiers([oddMonthly])).toEqual([{ tier: "odd-yearly", monthly: oddMonthly, yearly: null }]);
  });
});

describe("planForInterval", () => {
  const [, basicTier, proTier] = groupPlanTiers([starter, basic, pro, proYearly]);

  it("sells the yearly plan on yearly billing, and the monthly one otherwise", () => {
    expect(planForInterval(proTier, "year")).toBe(proYearly);
    expect(planForInterval(proTier, "month")).toBe(pro);
  });

  it("falls back to monthly for a tier with no yearly plan", () => {
    expect(planForInterval(basicTier, "year")).toBe(basic);
  });
});

describe("yearly savings", () => {
  it("is the share of twelve monthly payments saved, rounded down", () => {
    expect(yearlySavingsPercent(2900, 26100)).toBe(25);
    expect(yearlySavingsPercent(6900, 62100)).toBe(25);
    expect(yearlySavingsPercent(1200, 12000)).toBe(16); // two months free is 16.7%
    expect(yearlySavingsPercent(2900, 34800)).toBe(0);
    expect(yearlySavingsPercent(2900, 40000)).toBe(0);
    expect(yearlySavingsPercent(0, 0)).toBe(0);
  });

  it("labels the toggle with one saving, or the best one when tiers differ", () => {
    expect(yearlySavingsLabel(groupPlanTiers([starter, pro, proYearly, studio, studioYearly]))).toBe("Save 25%");
    const studioTwoMonthsFree = { ...studioYearly, priceCents: 69000 };
    expect(yearlySavingsLabel(groupPlanTiers([pro, proYearly, studio, studioTwoMonthsFree]))).toBe("Save up to 25%");
    expect(yearlySavingsLabel(groupPlanTiers([starter, basic, pro]))).toBeNull();
  });
});

describe("prices", () => {
  it("spreads a yearly price over twelve months", () => {
    expect(monthlyPriceCents(proYearly)).toBe(2175);
    expect(monthlyPriceCents(pro)).toBe(2900);
  });

  it("shows cents only when there are some", () => {
    expect(formatUsd(2900)).toBe("$29");
    expect(formatUsd(2175)).toBe("$21.75");
    expect(formatUsd(0)).toBe("$0");
  });
});
