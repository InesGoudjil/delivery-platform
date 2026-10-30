"use client";

import { Check, MessageCircle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypographySpan } from "@/components/ui/typography";

interface DeliveryActionBarProps {
  brandName: string;
  totalAssets: number;
  approvedCount: number;
  allApproved: boolean;
  isApprovingAll: boolean;
  onMessageCreator: () => void;
  onApproveAll: () => void;
  onUnapproveAll: () => void;
}

export function DeliveryActionBar({
  brandName,
  totalAssets,
  approvedCount,
  allApproved,
  isApprovingAll,
  onMessageCreator,
  onApproveAll,
  onUnapproveAll,
}: DeliveryActionBarProps) {
  const percent = Math.round((approvedCount / (totalAssets || 1)) * 100);
  const brandFirstName = brandName.split(" ")[0].toUpperCase();

  return (
    <Card className="bg-[#141416]/90 border border-white/10 rounded-2xl backdrop-blur-xl shadow-xl">
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:px-6">
        {/* Left: Progress Indicator */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="flex-1 sm:w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <TypographySpan className="text-xs sm:text-sm text-[#aeaeb4] font-sans whitespace-nowrap">
            {approvedCount} of {totalAssets} assets approved
          </TypographySpan>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={onMessageCreator}
            className="rounded-full bg-white/10 hover:bg-white/15 text-white border-white/15 font-bold text-xs tracking-wider uppercase px-5 py-2.5 transition-colors cursor-pointer h-auto gap-2"
          >
            <MessageCircle className="size-4" />
            <TypographySpan>MESSAGE {brandFirstName}</TypographySpan>
          </Button>

          {allApproved ? (
            <Button
              variant="outline"
              onClick={onUnapproveAll}
              disabled={isApprovingAll}
              className="group rounded-full bg-[#86b98f]/20 hover:bg-amber-500/20 text-[#86b98f] hover:text-amber-300 border-[#86b98f]/40 hover:border-amber-500/40 font-bold text-xs tracking-wider uppercase px-5 py-2.5 transition-colors cursor-pointer h-auto gap-2"
            >
              {isApprovingAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Check className="size-4 group-hover:hidden" />
                  <RotateCcw className="size-3.5 hidden group-hover:block" />
                </>
              )}
              <TypographySpan>PROJECT APPROVED · UNDO</TypographySpan>
            </Button>
          ) : (
            <Button
              onClick={onApproveAll}
              disabled={isApprovingAll}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider uppercase px-6 py-2.5 shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] cursor-pointer h-auto gap-2"
            >
              {isApprovingAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              <TypographySpan>APPROVE ALL</TypographySpan>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
