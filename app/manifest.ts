import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CineSpace — Creative Delivery Platform",
    short_name: "CineSpace",
    description:
      "Ultra-fast media delivery, client approvals, and interactive video review for filmmakers.",
    start_url: "/",
    display: "standalone",
    background_color: "#070709",
    theme_color: "#070709",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/images/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
