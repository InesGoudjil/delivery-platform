"use client";

import { useSyncExternalStore } from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

/** Where reports go: NEXT_PUBLIC_ABUSE_EMAIL, else the address the legal pages already publish. */
const REPORT_EMAIL = process.env.NEXT_PUBLIC_ABUSE_EMAIL || "hello@cinespace.film";

/**
 * "Report a problem" on public pages (roadmap 5.6): opens an email to CineSpace with the page's
 * address in it, so the team can find the content and, if needed, suspend the workspace.
 */
const noSubscription = () => () => {};

export function ReportLink({ className }: { className?: string }) {
  // The page's own address once in the browser; the server render leaves a placeholder.
  const page = useSyncExternalStore(noSubscription, () => window.location.href, () => "");

  const subject = "Report: content on CineSpace";
  const body = `Page: ${page || "(paste the link here)"}\n\nWhat's wrong:\n`;
  const href = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a href={href} className={cn("inline-flex items-center gap-1", className)}>
      <Flag className="size-3" aria-hidden /> Report a problem
    </a>
  );
}
