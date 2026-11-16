const BASE = "https://return-path.invalid";

/**
 * A same-site path to send someone to after signing in (`?redirect=`, `next`), or `fallback`.
 *
 * Refuses anything that could leave the site:
 * - absolute URLs;
 * - `//host`;
 * - backslashes, because browsers read `/\host` as `//host`;
 * - control characters, because browsers drop tabs and newlines, so `/\t/host` becomes `//host`.
 *
 * Edge-safe.
 */
export function safeReturnPath(raw: string | null | undefined, fallback = "/"): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
