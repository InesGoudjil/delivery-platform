"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="rounded-2xl bg-[#121215] border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
      {/* Progress Info & Bar */}
      <div className="flex-1 w-full space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>
            {approvedCount} of {totalAssetsCount} approved by client
          </span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#f5551d] to-[#ff8a45] transition-all duration-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        {/* MARK APPROVED / APPROVE CUT Button */}
        {projectStatus !== "approved" && (
          <Button
            onClick={onApproveCut}
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-extrabold text-xs px-4 py-2.5 shadow-md cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <Check className="size-4" />
            <span>APPROVE CUT</span>
          </Button>
        )}

        {/* UPLOAD ASSET Button */}
        <Button
          onClick={onToggleUploader}
          className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs px-5 py-2.5 shadow-md shrink-0 cursor-pointer flex items-center gap-1.5 w-full sm:w-auto justify-center"
        >
          <Plus className="size-4" />
          <span>UPLOAD ASSET</span>
        </Button>
      </div>
    </div>
  );
}
