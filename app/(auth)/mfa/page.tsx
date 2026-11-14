import type { Metadata } from "next";
import { Suspense } from "react";

import { TwoFactorCheck } from "@/components/mfa/two-factor-check";
import { BrandLogo } from "@/components/ui/brand-logo";

export const metadata: Metadata = {
  title: "Two-factor check | CineSpace",
  description: "Confirm it's you with your authenticator app",
  robots: { index: false, follow: false },
};

export default function TwoFactorPage() {
  return (
    <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
      <div className="flex justify-center gap-2 md:justify-start">
        <BrandLogo href="/" size="md" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">
          <Suspense fallback={null}>
            <TwoFactorCheck />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
