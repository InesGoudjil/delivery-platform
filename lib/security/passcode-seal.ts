import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { derivedKey } from "./derived-key";

/**
 * Generated passcodes (three words and four digits, lib/security/passphrase.ts) are also kept
 * encrypted, so the studio can see and copy them again from its Links page. A passcode the studio
 * typed is only hashed: it might be someone's personal password. Checking a passcode always uses
 * the hash; the sealed copy is only for showing it.
 *
 * AES-256-GCM with a key derived from DELIVERY_ACCESS_SECRET (or the service role key). If that
 * secret changes, sealed passcodes can't be opened any more: links keep working, the studio just
 * resets the passcode to see one again.
 */

const VERSION = "v1";
const AAD = Buffer.from("cut:share-link-passcode:v1");

function key(): Buffer {
  return derivedKey("cut:share-link-passcode-seal:v1");
}

/** "velvet-falcon-lens-4821": what the generator makes. */
const GENERATED = /^[a-z]{2,12}-[a-z]{2,12}-[a-z]{2,12}-\d{4}$/;

export function isGeneratedPassphrase(value: string): boolean {
  return GENERATED.test(value.trim());
}

/** "v1.<iv>.<ciphertext>.<tag>", each base64url. */
export function sealPasscode(passcode: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(passcode, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
}

/** The passcode, or null when there's none or it can't be opened (tampered with, or the secret changed). */
export function unsealPasscode(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const [, iv, ciphertext, tag] = parts.map((part, index) => (index === 0 ? Buffer.alloc(0) : Buffer.from(part, "base64url")));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
