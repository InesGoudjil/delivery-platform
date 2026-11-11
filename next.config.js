/**
 * Hostname of a URL or bare domain from the environment, or null.
 */
function hostOf(value) {
  if (!value) return null;
  try {
    return new URL(/^https?:\/\//.test(value) ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
}

// Only our own storage hosts may be fetched by the image optimizer (/_next/image).
// Remote images in the app use `unoptimized` and never reach it.
const configuredImageHosts = [
  hostOf(process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN),
  hostOf(process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN),
  hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL),
].filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.100.130'],
  reactStrictMode: true,
  images: {
    remotePatterns: [...new Set(configuredImageHosts)].map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
  async rewrites() {
    return [
      // PostHog reverse proxy: lets the browser SDK call /ingest on
      // our own domain so ad-blockers don't strip it.
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
