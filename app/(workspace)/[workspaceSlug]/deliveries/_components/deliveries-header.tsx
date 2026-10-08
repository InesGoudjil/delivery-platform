"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createDeliveryAction } from "@/app/actions/deliveries";

interface DeliveriesHeaderProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  features?: Record<string, any>;
  activeCount?: number;
}

export function DeliveriesHeader({
  workspace,
  features,
  activeCount = 0,
}: DeliveriesHeaderProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientLinksLimit = features?.client_links ?? 1;
  const isUnlimited = clientLinksLimit === -1;
  const isAtLimit = !isUnlimited && activeCount >= clientLinksLimit;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;

    setCreating(true);
    setErrorMessage(null);

    const res = await createDeliveryAction(
      workspace.id,
      newTitle.trim(),
      undefined,
      newClient.trim() || undefined
    );

    if (res?.success && (res.delivery || res.project)) {
      const createdId = res.delivery?.id || res.project?.id;
      setShowCreateModal(false);
      setNewTitle("");
      setNewClient("");
      router.push(`/${workspace.slug}/deliveries/${createdId}`);
    } else {
      setErrorMessage(res?.error || "Failed to create project delivery room.");
    }
    setCreating(false);
  };

  return (
    <>
      {/* Create Delivery Project Modal using shadcn Dialog */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            setNewTitle("");
            setNewClient("");
            setErrorMessage(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="space-y-1.5">
              <Badge variant="orange" className="font-mono text-[11px] w-fit">
                NEW REVIEW ROOM
              </Badge>
              <DialogTitle className="text-xl font-bold font-display text-card-foreground">
                Create Delivery Workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Set up a dedicated 4K review workspace for your client.
              </DialogDescription>
            </div>
          </DialogHeader>

          {isAtLimit && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  Delivery Link Limit Reached ({activeCount} / {clientLinksLimit} Active)
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Your current plan allows up to {clientLinksLimit} active project delivery link{clientLinksLimit > 1 ? "s" : ""}. To create more review rooms, archive an existing project or upgrade your plan.
              </p>
              <div className="pt-1">
                <Button
                  asChild
                  size="sm"
                  className="bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs h-8 rounded-full"
                >
                  <Link href={`/${workspace.slug}/subscription`}>
                    Upgrade Plan (Unlimited Links)
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                Project Title <span className="text-[#f5551d]">*</span>
              </Label>
              <Input
                type="text"
                required
                disabled={isAtLimit}
                placeholder="e.g. Omakase Counter Launch Film"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                Client / Brand Name
              </Label>
              <Input
                type="text"
                disabled={isAtLimit}
                placeholder="e.g. Lost in Tokyo Group"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || isAtLimit}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-black font-bold text-xs rounded-full shadow-md disabled:opacity-50"
              >
                {creating ? "Creating..." : isAtLimit ? "Plan Limit Reached" : "Create & Upload Cut"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1 font-semibold">
            WORKSPACE DASHBOARD
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            Client Deliveries
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-sans">
            Your projects and client review links with 4K HDR streaming, timecoded feedback, and WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isUnlimited && (
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline px-3 py-1.5 rounded-full border border-border bg-card/60">
              {activeCount} / {clientLinksLimit} active links
            </span>
          )}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-black font-bold text-xs px-5 py-2.5 h-auto rounded-full shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="size-4" /> New Delivery Room
          </Button>
        </div>
      </div>
    </>
  );
}
