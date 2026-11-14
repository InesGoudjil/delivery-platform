import { env } from "@/lib/env";

/**
 * Link to a customer or subscription in the Stripe dashboard, in test or live mode to match the
 * secret key the app uses. Null for anything that isn't a Stripe id.
 */
export function stripeDashboardUrl(kind: "customers" | "subscriptions", id: string | null | undefined): string | null {
  if (!id) return null;
  const prefix = kind === "customers" ? "cus_" : "sub_";
  if (!id.startsWith(prefix) || !/^[A-Za-z0-9_]+$/.test(id)) return null;
  const key = env.STRIPE_SECRET_KEY.trim();
  const testMode = key.startsWith("sk_test_") || key.startsWith("rk_test_");
  return `https://dashboard.stripe.com${testMode ? "/test" : ""}/${kind}/${id}`;
}
