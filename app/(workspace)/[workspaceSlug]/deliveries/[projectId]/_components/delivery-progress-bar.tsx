"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardAction } from "@/components/ui/card";

interface DeliveryProgressBarProps {
  approvedCount: number;
  totalAssetsCount: number;
  projectStatus: string;
  onApproveCut: () => void;
  onToggleUploader: () => void;
}

export function DeliveryProgressBar({
  approvedCount,
  totalAssetsCount,
  projectStatus,
  onApproveCut,
  onToggleUploader,
}: DeliveryProgressBarProps) {
  const percentage = totalAssetsCount > 0 ? Math.round((approvedCount / totalAssetsCount) * 100) : 0;

  return (
    <Card className="rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg hover:translate-y-0 hover:shadow-lg">
      {/* Progress Info & Bar */}
      <CardContent className="p-0 flex-1 w-full space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>
            {approvedCount} of {totalAssetsCount} approved by client
          </span>
          <span className="font-semibold text-foreground">{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden border border-border/20">
          <div
            className="h-full bg-gradient-to-r from-primary to-[#ff8a45] transition-all duration-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardContent>

      <CardAction className="flex items-center gap-2 shrink-0 w-full sm:w-auto self-auto">
        {/* MARK APPROVED / APPROVE CUT Button */}
        {projectStatus !== "approved" && (
          <Button
            onClick={onApproveCut}
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-extrabold text-xs px-4 py-2.5 shadow-sm cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <Check className="size-4" />
            <span>APPROVE CUT</span>
          </Button>
        )}

        {/* UPLOAD ASSET Button */}
        <Button
          onClick={onToggleUploader}
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-5 py-2.5 shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <Plus className="size-4" />
          <span>UPLOAD ASSET</span>
        </Button>
      </CardAction>
    </Card>
  );
}
