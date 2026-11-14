import type { MetadataRoute } from "next";

/**
 * Crawlers stay out of the admin panel, the API and the two-factor page.
 *
 * Pages opened through a private link (/deliver/<token>, /invite/<token>) are left out of this
 * list on purpose. Blocking them here would stop crawlers from reading their `noindex`, and the
 * bare link, token included, could then still be listed in search results. They send `noindex`
 * instead (see their page metadata).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/mfa"],
      },
    ],
  };
}
