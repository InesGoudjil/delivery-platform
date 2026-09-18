"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface WaitlistInviteClaimProps {
  token: string;
  email: string;
}

export function WaitlistInviteClaim({ token, email }: WaitlistInviteClaimProps) {
  return (
    <Card className="max-w-md w-full border border-[#f5551d]/30 bg-[#0e0e12] text-[#f6f3ec] shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#f5551d]/10 text-[#f5551d] border border-[#f5551d]/20 mb-3">
          <Sparkles className="size-7" />
        </div>
        <CardTitle className="text-2xl font-bold font-heading">
          You're In! Welcome to Cut.
        </CardTitle>
        <CardDescription className="text-sm text-white/60">
          Your waitlist spot has been unlocked for:
          <br />
          <strong className="text-white font-mono">{email}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-white/70 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#f5551d]" />
            <span>Priority access to high-bitrate video delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#f5551d]" />
            <span>3 months Pro access activated</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#f5551d]" />
            <span>Dedicated client review workspace</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button
          asChild
          className="w-full rounded-full py-6 text-sm font-bold uppercase tracking-wider bg-[#f5551d] hover:bg-[#e04a16] text-white shadow-lg shadow-[#f5551d]/20"
        >
          <Link href={`/signup?email=${encodeURIComponent(email)}&waitlist_token=${token}`}>
            <span>Activate Account</span>
            <ArrowRight className="size-4 ml-2" />
          </Link>
        </Button>
        <p className="text-[11px] text-center text-white/40">
          Token is reserved exclusively for this email address.
        </p>
      </CardFooter>
    </Card>
  );
}
