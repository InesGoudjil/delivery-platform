import type { Metadata } from "next";

import { BrandLogo } from "@/components/ui/brand-logo";
import { AccountSetupForm, SetupLinkUnusable } from "@/components/welcome/account-setup-form";
import { findSetupLink } from "@/core/security/account-setup";
import { createScopedLogger } from "@/lib/logger";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const log = createScopedLogger({ page: "welcome" });

// The URL carries a setup link, so it stays out of search results (see app/robots.ts).
export const metadata: Metadata = {
  title: "Set up your account | CineSpace",
  description: "Choose a password for your CineSpace account.",
  robots: { index: false, follow: false },
};

type Setup =
  | { kind: "ready"; email: string; firstName: string | null; studioName: string | null; signedInAs: string | null }
  | { kind: "unusable" }
  | { kind: "unavailable" };

/**
 * Where a setup link lands (Admin → Users → New client, core/security/account-setup.ts). Opening
 * it changes nothing: the link is only used when the form is sent, so an email scanner that
 * follows links doesn't use it up.
 */
export default async function WelcomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const setup = await lookUp(token);

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <BrandLogo href="/" size="md" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {setup.kind === "ready" ? (
              <AccountSetupForm
                token={token}
                email={setup.email}
                firstName={setup.firstName}
                studioName={setup.studioName}
                signedInAs={setup.signedInAs}
              />
            ) : setup.kind === "unusable" ? (
              <SetupLinkUnusable />
            ) : (
              <SetupLinkUnusable message="We couldn't check this link just now. Please try again in a minute." />
            )}
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <img
          src="/images/hero.jpg"
          alt="CineSpace Studio"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.7] dark:brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end p-10 text-white">
          <div className="max-w-lg space-y-2">
            <p className="text-xl font-medium leading-snug text-white/95">
              Your portfolio, your deliveries and your clients&apos; approvals, in one place.
            </p>
            <p className="text-sm text-white/60">CineSpace Studio Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function lookUp(token: string): Promise<Setup> {
  try {
    const admin = createServiceRoleClient();
    const check = await findSetupLink(admin, token);
    if (check.ok === false) return { kind: "unusable" };

    const { data: workspace } = await admin
      .from("workspaces")
      .select("brand_name")
      .eq("owner_id", check.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const fullName = typeof check.user.user_metadata?.full_name === "string" ? check.user.user_metadata.full_name : "";
    return {
      kind: "ready",
      email: check.email,
      firstName: fullName.trim().split(/\s+/)[0] || null,
      studioName: (workspace as { brand_name?: string } | null)?.brand_name ?? null,
      signedInAs: await otherSignedInEmail(check.user.id),
    };
  } catch (err) {
    log.error({ err }, "Couldn't check a setup link");
    return { kind: "unavailable" };
  }
}

/** The email of whoever else is signed in on this browser, if anyone. */
async function otherSignedInEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await (await createClient()).auth.getClaims();
    const claims = data?.claims as { sub?: string; email?: string } | undefined;
    return claims?.sub && claims.sub !== userId ? (claims.email ?? "another account") : null;
  } catch {
    return null;
  }
}
