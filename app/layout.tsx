import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/context";
import { MetaPixel } from "@/components/meta/MetaPixel";
import { MetaPageView } from "@/components/meta/MetaPageView";
import { PostHogProvider } from "@/lib/posthog/client";
import { PostHogPageView } from "@/components/posthog/PostHogPageView";
import { PostHogIdentify } from "@/components/posthog/PostHogIdentify";
import { PwaRegister } from "@/components/pwa/pwa-register";

const satoshi = localFont({
  src: [
    {
      path: "../public/fonts/Satoshi-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Satoshi-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Satoshi-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "CineSpace — Deliver films like a studio.",
  description:
    "Your portfolio, client review, and delivery — in one place, built for filmmakers in the Gulf.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CineSpace",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#070709",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${satoshi.variable} font-sans`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
                const _orig = window.performance.measure.bind(window.performance);
                window.performance.measure = function(name, startOrOptions, endMark) {
                  try {
                    return _orig(name, startOrOptions, endMark);
                  } catch (err) {
                    // Silently ignore negative timestamp/duration DOMExceptions from profilers
                  }
                };
              }
            `,
          }}
        />
        <MetaPixel />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            <I18nProvider initialLocale="en">
              {children}
            </I18nProvider>
            <PwaRegister />
            <Toaster position="bottom-right" richColors closeButton />
            <PostHogIdentify />
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            <Suspense fallback={null}>
              <MetaPageView />
            </Suspense>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
