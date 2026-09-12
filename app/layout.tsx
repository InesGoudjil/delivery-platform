import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/i18n/context";

const manrope = localFont({
  src: "../public/fonts/Manrope-Regular.otf",
  variable: "--font-manrope",
  display: "swap",
});

const satoshi = localFont({
  src: "../public/fonts/Satoshi-Black.otf",
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CineSpace — Deliver films like a studio.",
  description:
    "Your portfolio, client review, and delivery — in one place, built for filmmakers in the Gulf.",
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
      className={`${manrope.variable} ${satoshi.variable}`}
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
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#f5551d] selection:text-black">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale="en">
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
