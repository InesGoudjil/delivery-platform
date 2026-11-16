import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCheck2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { acceptTermsAction } from "@/app/actions/account";
import { getServerServices } from "@/core/server";
import { safeReturnPath } from "@/lib/security/return-path";

export const metadata: Metadata = {
  title: "Accept the terms | CineSpace",
  robots: { index: false, follow: false },
};

/**
 * Asked once after sign-in when the account has no record of accepting the current Terms
 * (core/security/finish-sign-in.ts): accounts made with Google, or made before the terms
 * checkbox existed, and everyone after the Terms change (lib/legal/terms.ts).
 */
export default async function AcceptTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: rawReturnTo, error } = await searchParams;
  const returnTo = safeReturnPath(rawReturnTo, "/");

  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/accept-terms?redirect=${encodeURIComponent(returnTo)}`)}`);
  }

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
      <div className="flex justify-center gap-2 md:justify-start">
        <BrandLogo href="/" size="md" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm space-y-5">
          <div className="space-y-2">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileCheck2 className="size-6" />
            </div>
            <h1 className="text-2xl font-bold">One more step</h1>
            <p className="text-sm text-muted-foreground">
              Please read and accept the CineSpace Terms of Service and Privacy Policy to keep using your account.
            </p>
          </div>

          <form action={acceptTermsAction} className="space-y-4">
            <input type="hidden" name="redirect" value={returnTo} />
            <label className="flex items-start gap-3 text-sm leading-snug">
              <input type="checkbox" name="accept_terms" required className="mt-0.5 size-4 accent-primary" />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="font-medium underline underline-offset-4">
                  Terms of Service
                </Link>{" "}
                and the{" "}
                <Link href="/privacy" target="_blank" className="font-medium underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {error === "required" && (
              <p className="text-sm text-destructive">Tick the box to continue.</p>
            )}
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>

          <form action="/api/auth/signout" method="post" className="text-center">
            <button
              type="submit"
              className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
