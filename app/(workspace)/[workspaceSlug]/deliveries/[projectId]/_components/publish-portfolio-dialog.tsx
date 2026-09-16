"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { publishDeliveryToPortfolioAction } from "@/app/actions/deliveries";

interface PublishPortfolioDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  portfolio: {
    id: string;
    slug: string;
    title: string;
  } | null;
  workspaceSlug: string;
  projectTitle: string;
  projectDescription: string;
  clientName: string;
  triggerToast: (msg: string) => void;
}

export function PublishPortfolioDialog({
  isOpen,
  onOpenChange,
  projectId,
  portfolio,
  workspaceSlug,
  projectTitle,
  projectDescription,
  clientName,
  triggerToast,
}: PublishPortfolioDialogProps) {
  const [publishCategory, setPublishCategory] = useState("Commercial");
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!portfolio?.id) {
      triggerToast("No portfolio found for this workspace");
      return;
    }
    setIsPublishing(true);
    try {
      const res = await publishDeliveryToPortfolioAction(projectId, portfolio.id, {
        title: projectTitle,
        description: projectDescription,
        category: publishCategory,
      });

      if (res.success) {
        onOpenChange(false);
        triggerToast("✨ Published cut to your public Portfolio!");
      } else {
        triggerToast(res.error || "Failed to publish to portfolio");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121215] text-white border-white/20 rounded-3xl p-6 sm:p-8 max-w-md">
        <DialogHeader className="space-y-2">
          <span className="text-[11px] font-mono font-bold text-[#f5551d] uppercase tracking-wider">
            SHOWCASE SPOTLIGHT
          </span>
          <DialogTitle className="text-xl font-bold font-heading text-white">
            Publish Cut to Portfolio
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Instantly promote this approved delivery cut into your public portfolio showcase without re-uploading files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
              Showcase Category
            </label>
            <select
              value={publishCategory}
              onChange={(e) => setPublishCategory(e.target.value)}
              className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#f5551d]"
            >
              <option value="Commercial">Commercial / Brand</option>
              <option value="Narrative">Narrative / Short Film</option>
              <option value="Music Video">Music Video</option>
              <option value="Documentary">Documentary</option>
              <option value="Automotive">Automotive</option>
              <option value="Fashion">Fashion / Editorial</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
            <div className="text-[11px] font-mono text-muted-foreground uppercase">Target Showcase:</div>
            <div className="font-bold text-white">{projectTitle}</div>
            <div className="text-muted-foreground text-[11px]">Client: {clientName}</div>
            <div className="text-[#f5551d] text-[11px] font-mono">
              {portfolio ? `Publishes to /${workspaceSlug}/portfolio` : "Creates your public portfolio showcase"}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs px-5 py-2.5 cursor-pointer shadow-lg shadow-[#f5551d]/20 flex items-center gap-2"
            >
              <Sparkles className="size-3.5" />
              <span>{isPublishing ? "Publishing..." : "Publish to Portfolio"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
