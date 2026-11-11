import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";

const SCRYPT_PREFIX = "scrypt$";
const SCRYPT_KEY_LENGTH = 32;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

function scrypt(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/**
 * Hashes a delivery passcode for storage as `scrypt$<salt>$<hash>` (base64, random salt).
 */
export async function hashDeliveryPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(passcode, salt, SCRYPT_KEY_LENGTH);
  return `${SCRYPT_PREFIX}${salt.toString("base64")}$${hash.toString("base64")}`;
}

/**
 * Checks a passcode typed by a client against the stored value.
 *
 * Supports the current scrypt format and two legacy formats (unsalted SHA-256 hex,
 * and plaintext). A stored hash is never accepted as the passcode, so a leaked
 * hash cannot be replayed. All comparisons are constant-time.
 */
export async function verifyDeliveryPasscode(
  candidate: string | null | undefined,
  stored: string | null | undefined
): Promise<boolean> {
  if (!candidate || !stored) return false;

  if (stored.startsWith(SCRYPT_PREFIX)) {
    const [, saltB64, hashB64] = stored.split("$");
    if (!saltB64 || !hashB64) return false;
    const expected = Buffer.from(hashB64, "base64");
    if (expected.length === 0) return false;
    try {
      const actual = await scrypt(candidate, Buffer.from(saltB64, "base64"), expected.length);
      return safeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  if (SHA256_HEX.test(stored)) {
    // Legacy unsalted SHA-256: compare digests, never the raw stored string.
    return safeEqual(sha256(candidate), Buffer.from(stored, "hex"));
  }

  // Legacy plaintext passcode.
  return safeEqual(sha256(candidate), sha256(stored));
}
