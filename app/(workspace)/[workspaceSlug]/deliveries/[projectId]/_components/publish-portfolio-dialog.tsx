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
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
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
      <DialogContent className="bg-card text-card-foreground border-border rounded-3xl p-6 sm:p-8 max-w-md shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <Badge variant="orange" className="w-fit text-[10px] font-mono font-bold uppercase tracking-wider">
            SHOWCASE SPOTLIGHT
          </Badge>
          <DialogTitle className="text-xl font-bold font-heading text-foreground">
            Publish Cut to Portfolio
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Instantly promote this approved delivery cut into your public portfolio showcase without re-uploading files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Field orientation="vertical">
            <FieldLabel htmlFor="publish-cat" className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
              Showcase Category
            </FieldLabel>
            <select
              id="publish-cat"
              value={publishCategory}
              onChange={(e) => setPublishCategory(e.target.value)}
              className="w-full bg-muted/40 border border-input rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="Commercial">Commercial / Brand</option>
              <option value="Narrative">Narrative / Short Film</option>
              <option value="Music Video">Music Video</option>
              <option value="Documentary">Documentary</option>
              <option value="Automotive">Automotive</option>
              <option value="Fashion">Fashion / Editorial</option>
            </select>
          </Field>

          <Card className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1.5 text-xs hover:translate-y-0">
            <CardContent className="p-0 space-y-1">
              <div className="text-[11px] font-mono text-muted-foreground uppercase">Target Showcase:</div>
              <div className="font-bold text-foreground">{projectTitle}</div>
              <div className="text-muted-foreground text-[11px]">Client: {clientName}</div>
              <div className="text-primary text-[11px] font-mono pt-0.5">
                {portfolio ? `Publishes to /${workspaceSlug}/portfolio` : "Creates your public portfolio showcase"}
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-border -mx-6 -mb-6 p-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-5 py-2.5 cursor-pointer shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Sparkles className="size-3.5" />
              <span>{isPublishing ? "Publishing..." : "Publish to Portfolio"}</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
