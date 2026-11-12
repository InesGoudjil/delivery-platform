/**
 * Client-room passcodes: the length rule and a generator for readable ones
 * ("velvet-falcon-lens-4821").
 *
 * The generator uses the Web Crypto API, so it runs in the browser and on the server.
 * Three words from 64-word lists plus four digits give 64³ × 10⁴ ≈ 2.6 billion
 * combinations (about 31 bits), far beyond what the passcode rate limit lets anyone try.
 */

/** Custom passcodes need at least this many characters (after trimming). */
export const MIN_PASSCODE_LENGTH = 8;
export const MAX_PASSCODE_LENGTH = 128;

const ADJECTIVES = [
  "amber", "ashen", "azure", "bold", "brave", "bright", "calm", "candid",
  "cinematic", "clear", "coastal", "cobalt", "crimson", "crisp", "dawn", "deep",
  "desert", "dusky", "early", "electric", "emerald", "epic", "fading", "fierce",
  "gentle", "gilded", "golden", "grand", "hazy", "hidden", "hyper", "ivory",
  "jade", "keen", "late", "lucid", "lunar", "misty", "modern", "noble",
  "ochre", "pale", "quiet", "rapid", "rare", "royal", "rustic", "sandy",
  "scarlet", "sharp", "silent", "silver", "smoky", "solar", "stellar", "still",
  "swift", "tidal", "urban", "velvet", "vivid", "warm", "wild", "windy",
];

const NOUNS = [
  "aperture", "apex", "arc", "beacon", "cameo", "canyon", "cedar", "comet",
  "cut", "delta", "dolly", "dune", "echo", "ember", "fader", "falcon",
  "field", "filter", "flare", "focus", "frame", "gaffer", "glow", "grain",
  "harbor", "horizon", "island", "jib", "lantern", "lens", "light", "marble",
  "meadow", "mesa", "mirror", "montage", "oasis", "orbit", "palm", "pixel",
  "prism", "reel", "ridge", "river", "scene", "score", "shadow", "shutter",
  "sierra", "signal", "slate", "spark", "summit", "take", "tempo", "tide",
  "timeline", "track", "valley", "vista", "wave", "willow", "zenith", "zoom",
];

/** Uniform random integer in [0, max), without modulo bias. */
function randomIndex(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

const pick = (words: readonly string[]) => words[randomIndex(words.length)];

/** A random, readable passcode, e.g. "velvet-falcon-lens-4821". */
export function generatePassphrase(): string {
  const digits = String(randomIndex(10_000)).padStart(4, "0");
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(NOUNS)}-${digits}`;
}

/** Why a custom passcode is refused, or null when it's acceptable. */
export function passcodeProblem(passcode: string): string | null {
  const length = passcode.trim().length;
  if (length < MIN_PASSCODE_LENGTH) return `Use at least ${MIN_PASSCODE_LENGTH} characters for the passcode.`;
  if (length > MAX_PASSCODE_LENGTH) return `Passcodes can be at most ${MAX_PASSCODE_LENGTH} characters.`;
  return null;
}
