import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Client-room cookies.
 *
 * 1. Unlock cookie. After a client enters the right passcode, the server sets an httpOnly
 *    cookie for that room. It's signed over the delivery id, its current share token and
 *    its current passcode hash, so changing the passcode or regenerating the link locks
 *    everyone out again. It lasts 14 days at most, and never past the link's expiry.
 *
 * 2. Guest author key. A random value per room and browser, set when a guest first
 *    comments. Its SHA-256 is stored on their comments, which is how the server knows a
 *    guest may edit or delete a comment: only from the browser that wrote it.
 *
 * Cookie names use a hash of the share token, never the token itself.
 */

export const ROOM_ACCESS_TTL_SECONDS = 60 * 60 * 24 * 14;
const GUEST_KEY_TTL_SECONDS = 60 * 60 * 24 * 365;
const TOKEN_VERSION = "v2";

/** The fields an unlock cookie is bound to. */
export interface RoomAccessSubject {
  id: string;
  shareToken: string;
  passcodeHash?: string | null;
}

interface CookieReader {
  get: (name: string) => { value: string } | undefined;
}

function signingKey(): Buffer {
  const secret = process.env.DELIVERY_ACCESS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (secret.trim().length < 16 || secret === "your-supabase-service-role-key") {
    throw new Error("Set DELIVERY_ACCESS_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to sign client-room cookies.");
  }
  // A purpose-specific key, so the underlying secret is never used directly.
  return createHmac("sha256", secret).update("cut:client-room-access:v2").digest();
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 22);
}

function fingerprint(subject: RoomAccessSubject): string {
  return createHash("sha256")
    .update(`${subject.id}\n${subject.shareToken}\n${subject.passcodeHash ?? ""}`)
    .digest("base64url");
}

function mac(expiresAt: number, subject: RoomAccessSubject): Buffer {
  return createHmac("sha256", signingKey()).update(`${TOKEN_VERSION}.${expiresAt}.${fingerprint(subject)}`).digest();
}

export function roomAccessCookieName(shareToken: string): string {
  return `room_${shortHash(shareToken)}`;
}

export function guestAuthorCookieName(shareToken: string): string {
  return `room_guest_${shortHash(shareToken)}`;
}

/** "v2.<unix expiry>.<base64url HMAC>" */
export function createRoomAccessToken(
  subject: RoomAccessSubject,
  ttlSeconds: number = ROOM_ACCESS_TTL_SECONDS,
  now: number = Date.now()
): string {
  const expiresAt = Math.floor(now / 1000) + Math.max(1, Math.floor(ttlSeconds));
  return `${TOKEN_VERSION}.${expiresAt}.${mac(expiresAt, subject).toString("base64url")}`;
}

export function verifyRoomAccessToken(
  value: string | null | undefined,
  subject: RoomAccessSubject,
  now: number = Date.now()
): boolean {
  if (!value || typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= now) return false;
  // Never accept a cookie that claims to outlive the maximum lifetime.
  if (expiresAt * 1000 > now + (ROOM_ACCESS_TTL_SECONDS + 300) * 1000) return false;

  let provided: Buffer;
  try {
    provided = Buffer.from(parts[2], "base64url");
  } catch {
    return false;
  }
  const expected = mac(expiresAt, subject);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** True when the request carries a valid unlock cookie for this room. */
export function hasRoomAccess(cookieReader: CookieReader | null | undefined, subject: RoomAccessSubject): boolean {
  if (!cookieReader || typeof cookieReader.get !== "function") return false;
  return verifyRoomAccessToken(cookieReader.get(roomAccessCookieName(subject.shareToken))?.value, subject);
}

/** Sets the unlock cookie after a successful passcode check (or for a studio member). */
export async function grantRoomAccess(subject: RoomAccessSubject, linkExpiresAt?: string | null): Promise<void> {
  let ttl = ROOM_ACCESS_TTL_SECONDS;
  if (linkExpiresAt) {
    const secondsLeft = Math.floor((new Date(linkExpiresAt).getTime() - Date.now()) / 1000);
    if (Number.isFinite(secondsLeft)) ttl = Math.max(60, Math.min(ttl, secondsLeft));
  }
  const cookieStore = await cookies();
  cookieStore.set(roomAccessCookieName(subject.shareToken), createRoomAccessToken(subject, ttl), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
}

export function hashGuestAuthorKey(key: string): string {
  return createHash("sha256").update(`cut:guest-author:${key}`).digest("hex");
}

/** The hash of this browser's guest author key for the room, or null if it has none. */
export function readGuestAuthorKeyHash(cookieReader: CookieReader | null | undefined, shareToken: string): string | null {
  const value = cookieReader?.get(guestAuthorCookieName(shareToken))?.value;
  return value && /^[A-Za-z0-9_-]{32,64}$/.test(value) ? hashGuestAuthorKey(value) : null;
}

/** Returns this browser's guest author key hash for the room, creating the cookie if needed. */
export async function ensureGuestAuthorKeyHash(shareToken: string): Promise<string> {
  const cookieStore = await cookies();
  const existing = readGuestAuthorKeyHash(cookieStore, shareToken);
  if (existing) return existing;

  const key = randomBytes(32).toString("base64url");
  cookieStore.set(guestAuthorCookieName(shareToken), key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_KEY_TTL_SECONDS,
  });
  return hashGuestAuthorKey(key);
}
