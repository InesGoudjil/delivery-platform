/**
 * The visitor's IP address, read from the request headers. Rate limits and device rows use it.
 *
 * On Vercel, `x-vercel-forwarded-for`, `x-real-ip` and `x-forwarded-for` all carry the client's
 * address. Vercel's own header is read first. Behind any other proxy, the first
 * `x-forwarded-for` entry is whatever the client sent.
 *
 * Edge-safe.
 */
export function clientIpFromHeaders(headers: Pick<Headers, "get">, fallback = "127.0.0.1"): string {
  const first = (name: string) => headers.get(name)?.split(",")[0]?.trim() || null;
  return first("x-vercel-forwarded-for") || first("x-real-ip") || first("x-forwarded-for") || fallback;
}
