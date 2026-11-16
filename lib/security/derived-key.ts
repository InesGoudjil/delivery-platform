import { createHmac } from "crypto";

/**
 * A key for one purpose, derived from DELIVERY_ACCESS_SECRET (or the service role key, like the
 * client-room cookies), so the underlying secret is never used directly and keys for different
 * purposes never match. Throws when no usable secret is set.
 */
export function derivedKey(purpose: string): Buffer {
  const secret = process.env.DELIVERY_ACCESS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (secret.trim().length < 16 || secret === "your-supabase-service-role-key") {
    throw new Error("Set DELIVERY_ACCESS_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to sign share-link data.");
  }
  return createHmac("sha256", secret).update(purpose).digest();
}
