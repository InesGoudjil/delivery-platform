"use client";

import Link from "next/link";
import { Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TypographySpan } from "@/components/ui/typography";

interface DeliveryRoomHeaderProps {
  brandName: string;
  logoUrl?: string | null;
  slug: string;
  deliveryId: string;
  isExpired: boolean;
  expiresAt?: string | null;
  expiryLabel: string;
  isWorkspaceMember: boolean;
}

export function DeliveryRoomHeader({
  brandName,
  logoUrl,
  slug,
  deliveryId,
  isExpired,
  expiresAt,
  expiryLabel,
  isWorkspaceMember,
}: DeliveryRoomHeaderProps) {
  return (
    <>
      {/* Creator Preview Banner when link is expired */}
      {isExpired && isWorkspaceMember && (
        <div className="bg-amber-500/10 border border-amber-500/20 px-4 sm:px-6 py-3 rounded-2xl text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-400 shrink-0" />
            <TypographySpan>
              <strong>CREATOR PREVIEW MODE:</strong> This public link expired on{" "}
              {expiresAt ? new Date(expiresAt).toLocaleDateString() : "earlier"}. Clients are blocked from viewing this review room.
            </TypographySpan>
          </div>
          <Link
            href={`/${slug}/deliveries/${deliveryId}`}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded-lg font-bold text-[11px] transition-colors"
          >
            Renew Expiration &rarr;
          </Link>
        </div>
      )}

      {/* Prototype Brand Header */}
      <header className="py-4 border-b border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="h-7 w-auto object-contain"
            />
          ) : (
            <TypographySpan className="font-heading font-extrabold text-lg sm:text-xl text-[#f6f3ec] tracking-tight">
              {brandName}
              <TypographySpan className="text-primary">.</TypographySpan>
            </TypographySpan>
          )}
        </div>

        <Badge
          variant="outline"
          className={`rounded-full px-3.5 py-1.5 text-xs gap-2 font-normal ${
            isExpired
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
              : "border-white/15 bg-white/5 text-[#aeaeb4]"
          }`}
        >
          <Lock className="size-3" />
          <TypographySpan>Private · {expiryLabel}</TypographySpan>
        </Badge>
      </header>
    </>
  );
}
