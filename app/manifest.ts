import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CineSpace — Creative Delivery Platform",
    short_name: "CineSpace",
    description:
      "Ultra-fast media delivery, client approvals, and interactive video review for filmmakers.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#070709",
    theme_color: "#070709",
    categories: ["multimedia", "productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    shortcuts: [
      {
        name: "Deliveries",
        short_name: "Deliveries",
        description: "View current active project deliveries",
        url: "/",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "New Workspace",
        short_name: "New Workspace",
        description: "Create or switch workspace",
        url: "/new-workspace",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
