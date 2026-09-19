"use client";

import CineSpaceApp from "@/prototype/CineSpaceApp";
import "@/prototype/globals.css";

export default function DeliveryViewPage() {
  const Component = CineSpaceApp as React.ComponentType<{
    initialSurface?: string;
    embedded?: boolean;
  }>;

  return <Component initialSurface="client" embedded={true} />;
}
