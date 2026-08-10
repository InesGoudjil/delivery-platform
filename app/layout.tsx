import type { Metadata } from "next";
import { Archivo, Inter, Geist } from "next/font/google";
import "./globals.css";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

// const inter = Inter({subsets:['latin'],variable:'--font-sans'});

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

// const inter = Inter({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700"],
//   variable: "--font-inter",
//   display: "swap",
// });

export const metadata = {
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
    <html lang="en" className={`${manrope.variable} ${satoshi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
