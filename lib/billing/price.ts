import type { PricedPlan } from "@/core/entities/plan";

/** "$29", or "$21.75" when there are cents. Plans are priced in USD. */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

/** What a plan costs per month: a yearly price is spread over twelve months. */
export function monthlyPriceCents(plan: PricedPlan): number {
  return plan.billingInterval === "year" ? Math.round(plan.priceCents / 12) : plan.priceCents;
}
