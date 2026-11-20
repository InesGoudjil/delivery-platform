"use client";

import React, { useEffect, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypographySpan } from "@/components/ui/typography";

/**
 * What a client sees when the room fails to load. Never the error's own text: in production a
 * server error's message is Next's generic "An error occurred in the Server Components render…",
 * which means nothing to a client. The digest is shown instead, so the studio can quote it to us.
 */
export default function DeliverRoomError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Which error the visitor asked to retry: a failed retry brings a new error, which ends the spinner.
  const [retriedError, setRetriedError] = useState<Error | null>(null);
  const isRetrying = retriedError === error;

  useEffect(() => {
    console.error("Delivery Room Error Boundary:", error);
  }, [error]);

  // retry() fetches the room again (reset() would only re-render what already failed).
  const tryAgain = () => {
    setRetriedError(error);
    retry();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 text-[#f6f3ec]">
      <div className="max-w-md w-full rounded-3xl bg-[#141416] border border-white/10 p-8 text-center space-y-5 shadow-2xl">
        <div className="size-14 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive flex items-center justify-center mx-auto">
          <Lock className="size-7" />
        </div>
        <div className="space-y-1">
          <TypographySpan className="text-[11px]  text-primary uppercase tracking-widest font-semibold block">
            CLIENT REVIEW ROOM
          </TypographySpan>
          <h3 className="text-xl font-bold font-heading text-[#f6f3ec]">
            Unable to Access Delivery Cut
          </h3>
          <p className="text-xs text-[#8e8e93]">
            This review room couldn&apos;t be opened just now. Try again in a moment; if it keeps happening, ask
            the studio that sent you the link.
          </p>
          {error.digest && (
            <p className="text-[10px] text-[#6e6e73] pt-1 font-mono">Reference: {error.digest}</p>
          )}
        </div>
        <Button
          onClick={tryAgain}
          disabled={isRetrying}
          className="rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer h-10 px-6 shadow-md shadow-primary/25"
        >
          <RefreshCw className={`size-3.5 mr-2 ${isRetrying ? "animate-spin" : ""}`} /> Try Accessing Again
        </Button>
      </div>
    </div>
  );
}
