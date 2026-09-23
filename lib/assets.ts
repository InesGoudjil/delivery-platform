/**
 * Cloudflare R2 / CDN Asset Resolvers
 */

export const CLOUDFLARE_PUBLIC_DOMAIN = (
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN ||
  process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN ||
  process.env.NEXT_PUBLIC_CDN_URL ||
  "https://pub-f75d6eed12ad4331bab764fbe72ec72f.r2.dev"
).replace(/\/$/, "");

/**
 * Returns the full Cloudflare CDN URL for a waitlist image.
 * Concatenates the Cloudflare Public Domain with images/waitlist/${imageName}
 * Example: getWaitlistImageUrl("links.webp") -> "https://pub-f75d6eed12ad4331bab764fbe72ec72f.r2.dev/images/waitlist/links.webp"
 */
export function getWaitlistImageUrl(imageName: string): string {
  const cleanName = imageName.replace(/^\/+/, "").replace(/^images\/waitlist\//, "");
  return `${CLOUDFLARE_PUBLIC_DOMAIN}/images/waitlist/${cleanName}`;
}

/**
 * General helper to get any Cloudflare asset URL.
 */
export function getCloudflareAssetUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${CLOUDFLARE_PUBLIC_DOMAIN}/${cleanPath}`;
}
