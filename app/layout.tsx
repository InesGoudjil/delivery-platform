import type { Metadata } from "next";
import { Archivo, Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

// const inter = Inter({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700"],
//   variable: "--font-inter",
//   display: "swap",
// });

export const metadata: Metadata = {
  title: "CUT — Video-First Portfolio & Client Delivery Platform",
  description:
    "A video-first portfolio & client-delivery platform for filmmakers, built for the Gulf.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" 
    // className={cn(archivo.variable, inter.variable, "font-sans", inter.variable)}
    >
      <body className="bg-bg text-ink antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
