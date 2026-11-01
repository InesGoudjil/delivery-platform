import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const DELIVERY_COOKIE_PREFIX = "delivery_access_";
export const DELIVERY_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): string {
  const secret =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "cinespace-delivery-passcode-fallback-key-2026";
  return secret;
}

/**
 * Creates a signed access token in format: "v1:<timestamp>:<hmacHex>"
 */
export function generateDeliveryAccessToken(shareToken: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = getSecretKey();
  const dataToSign = `${shareToken}:${timestamp}`;
  const hmac = createHmac("sha256", secret).update(dataToSign).digest("hex");
  return `v1:${timestamp}:${hmac}`;
}

/**
 * Validates a signed access token. Checks signature authenticity and expiration.
 * Rejects unsigned static strings like "verified".
 */
export function verifyDeliveryAccessToken(
  tokenValue: string | undefined | null,
  shareToken: string,
  maxAgeSeconds: number = DELIVERY_TOKEN_TTL_SECONDS
): boolean {
  if (!tokenValue || typeof tokenValue !== "string") return false;

  const parts = tokenValue.split(":");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const timestamp = parseInt(parts[1], 10);
  const providedHmac = parts[2];

  if (isNaN(timestamp)) return false;

  // Expiration check (default 30 days, tolerates 5 minutes clock skew into future)
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > maxAgeSeconds || timestamp > now + 300) {
    return false;
  }

  // Cryptographic constant-time comparison
  const secret = getSecretKey();
  const dataToSign = `${shareToken}:${timestamp}`;
  const expectedHmac = createHmac("sha256", secret).update(dataToSign).digest("hex");

  try {
    const expectedBuffer = Buffer.from(expectedHmac, "hex");
    const providedBuffer = Buffer.from(providedHmac, "hex");
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

/**
 * Sets the signed delivery passcode cookie on the response cookie store.
 */
export async function setDeliveryPasscodeCookie(shareToken: string): Promise<void> {
  const cookieStore = await cookies();
  const signedToken = generateDeliveryAccessToken(shareToken);

  cookieStore.set(`${DELIVERY_COOKIE_PREFIX}${shareToken}`, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DELIVERY_TOKEN_TTL_SECONDS,
    path: "/",
  });
}

/**
 * Checks whether an incoming request cookie contains a valid cryptographic signature for the share token.
 */
export function hasValidDeliveryPasscodeCookie(
  cookieGetter: { get: (name: string) => { value: string } | undefined } | undefined | null,
  shareToken: string
): boolean {
  if (!cookieGetter || typeof cookieGetter.get !== "function") return false;
  const cookieVal = cookieGetter.get(`${DELIVERY_COOKIE_PREFIX}${shareToken}`)?.value;
  return verifyDeliveryAccessToken(cookieVal, shareToken);
}
