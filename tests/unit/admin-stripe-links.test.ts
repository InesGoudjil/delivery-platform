import { describe, it, expect, afterEach } from "vitest";
import { env } from "@/lib/env";
import { stripeDashboardUrl } from "@/app/(admin)/_lib/stripe-links";

const saved = env.STRIPE_SECRET_KEY;
const setKey = (key: string) => ((env as { STRIPE_SECRET_KEY: string }).STRIPE_SECRET_KEY = key);

afterEach(() => setKey(saved));

describe("stripeDashboardUrl", () => {
  it("links to test mode when the app uses a test key, and to live mode otherwise", () => {
    setKey("sk_test_123");
    expect(stripeDashboardUrl("customers", "cus_ABC")).toBe("https://dashboard.stripe.com/test/customers/cus_ABC");
    setKey("sk_live_123");
    expect(stripeDashboardUrl("subscriptions", "sub_XYZ")).toBe("https://dashboard.stripe.com/subscriptions/sub_XYZ");
  });

  it("only links real Stripe ids of the right kind", () => {
    expect(stripeDashboardUrl("customers", "sub_XYZ")).toBeNull();
    expect(stripeDashboardUrl("customers", "cus_../../evil")).toBeNull();
    expect(stripeDashboardUrl("customers", null)).toBeNull();
  });
});
