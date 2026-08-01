import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

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

export const metadata = {
  title: "CineSpace | Deliver films like a studio.",
  description:
    "Your portfolio, client review, and delivery — in one place, built for filmmakers in the Gulf.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${satoshi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
