import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";

export const metadata: Metadata = {
  title: "Email change | CineSpace",
  robots: { index: false, follow: false },
};

/** Where /api/auth/confirm sends email-change links (status: partial or done). */
const COPY = {
  partial: {
    title: "One address confirmed",
    body: "Now open the link we sent to your other address. Your email changes once both are confirmed.",
  },
  done: {
    title: "Your email address is changed",
    body: "From now on, sign in with your new address. Your password and two-factor settings stay the same.",
  },
} as const;

export default async function EmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const copy = status === "done" ? COPY.done : COPY.partial;

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
      <div className="flex justify-center gap-2 md:justify-start">
        <BrandLogo href="/" size="md" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.body}</p>
          </div>
          <Button className="w-full" render={<Link href="/login">Continue to sign in</Link>} />
        </div>
      </div>
    </div>
  );
}
