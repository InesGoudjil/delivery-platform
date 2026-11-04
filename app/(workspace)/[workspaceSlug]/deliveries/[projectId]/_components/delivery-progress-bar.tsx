"use client";

import { Check, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardAction } from "@/components/ui/card";
import { TypographySpan } from "@/components/ui/typography";

interface DeliveryProgressBarProps {
  approvedCount: number;
  totalAssetsCount: number;
  projectStatus: string;
  onApproveCut: () => void;
  onUnapproveCut?: () => void;
  onToggleUploader: () => void;
}

export function DeliveryProgressBar({
  approvedCount,
  totalAssetsCount,
  projectStatus,
  onApproveCut,
  onUnapproveCut,
  onToggleUploader,
}: DeliveryProgressBarProps) {
  const percentage = totalAssetsCount > 0 ? Math.round((approvedCount / totalAssetsCount) * 100) : 0;

  return (
    <Card className="rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg hover:translate-y-0 hover:shadow-lg">
      {/* Progress Info & Bar */}
      <CardContent className="p-0 flex-1 w-full space-y-2">
        <div className="flex items-center justify-between text-xs  text-muted-foreground">
          <TypographySpan variant="muted" className=" text-xs">
            {approvedCount} of {totalAssetsCount} approved by client
          </TypographySpan>
          <TypographySpan variant="small" className="font-semibold text-foreground ">{percentage}%</TypographySpan>
        </div>
        <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden border border-border/20">
          <div
            className="h-full bg-gradient-to-r from-primary to-[#ff8a45] transition-all duration-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardContent>

      <CardAction className="flex items-center gap-2 shrink-0 w-full sm:w-auto self-auto">
        {/* MARK APPROVED / UNAPPROVE CUT Button */}
        {projectStatus !== "approved" ? (
          <Button
            onClick={onApproveCut}
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-extrabold text-xs px-4 py-2.5 shadow-sm cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <Check className="size-4" />
            <TypographySpan variant="kicker" className="font-extrabold text-xs text-emerald-400">APPROVE CUT</TypographySpan>
          </Button>
        ) : (
          onUnapproveCut && (
            <Button
              onClick={onUnapproveCut}
              variant="outline"
              className="group rounded-full border-emerald-500/30 bg-emerald-500/10 hover:border-amber-500/40 hover:bg-amber-500/15 text-emerald-400 hover:text-amber-300 font-extrabold text-xs px-4 py-2.5 shadow-sm cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center transition-colors"
              title="Click to undo approval and return cut to review"
            >
              <Check className="size-4 group-hover:hidden" />
              <RotateCcw className="size-3.5 hidden group-hover:block" />
              <TypographySpan variant="kicker" className="font-extrabold text-xs">APPROVED · UNDO</TypographySpan>
            </Button>
          )
        )}

        {/* UPLOAD ASSET Button */}
        <Button
          onClick={onToggleUploader}
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-5 py-2.5 shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <Plus className="size-4" />
          <TypographySpan variant="kicker" className="font-extrabold text-xs text-primary-foreground">UPLOAD ASSET</TypographySpan>
        </Button>
      </CardAction>
    </Card>
  );
}
