import React from "react";
import { CineSpaceLoader } from "@/components/ui/cinespace-loader";

export default function RootLoading() {
  return (
    <CineSpaceLoader
      fullScreen
      showBar
      caption={
        <>
          Loading <b>Studio Workspace</b>
        </>
      }
    />
  );
}
