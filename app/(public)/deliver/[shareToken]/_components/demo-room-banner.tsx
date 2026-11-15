import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoRoomMode } from "./types";

/**
 * The strip at the top of the demo room (/demo). Visitors learn that it's a demo and that nothing
 * they do is saved; members of the demo's workspace, that what they do there is public.
 */
export function DemoRoomBanner({ mode }: { mode: DemoRoomMode }) {
  return (
    <div
      role="note"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2.5 text-sm leading-relaxed text-[#c9c6bf]">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        {mode === "visitor" ? (
          <span>
            <strong className="font-semibold text-[#f6f3ec]">Demo room.</strong> This is the page your
            clients get. Play a cut, leave a timecoded note or approve it: nothing you do here is saved
            or sent.
          </span>
        ) : (
          <span>
            <strong className="font-semibold text-[#f6f3ec]">This is the site&apos;s demo room.</strong>{" "}
            You&apos;re a member of its workspace, so your comments and approvals are saved, and every
            visitor sees them.
          </span>
        )}
      </p>
      {mode === "visitor" && (
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-full text-[#c9c6bf] hover:text-[#f6f3ec]">
            <Link href="/">Back to the site</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-3.5 font-semibold">
            <Link href="/signup">Start for free</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
