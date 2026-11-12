"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isPrivateAnalyticsPath } from "@/lib/analytics/private-paths";

interface MetaPixelProps {
  pixelId?: string;
}

/**
 * Injects the Meta Pixel base code via `next/script` with
 * `afterInteractive` strategy. Renders nothing when the pixel is
 * unconfigured so dev / preview environments are noise-free.
 *
 * The inline bootstrap mirrors the official snippet from Meta so the
 * initial PageView fires even if Next/Script's hydration swaps the
 * external script tag. The external `fbevents.js` library is what
 * actually defines `window.fbq` and processes the queue.
 *
 * Not loaded on private pages (client rooms, invitations, sign-in), and
 * `disablePushState` stops the pixel's own history listener, so client-side
 * navigation into a private page sends nothing. Later PageViews come from
 * `MetaPageView`, which skips private pages too.
 */
export function MetaPixel({ pixelId }: MetaPixelProps) {
  const pathname = usePathname();
  const id = pixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  if (!id) return null;
  if (isPrivateAnalyticsPath(pathname)) return null;

  // Skip in development unless explicitly enabled.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_META_DEV_PIXEL !== "true"
  ) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq.disablePushState = true;
            fbq('init', '${id}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
