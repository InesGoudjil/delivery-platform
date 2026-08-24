import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/i18n/context";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${manrope.variable} ${satoshi.variable}`}
    >
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
