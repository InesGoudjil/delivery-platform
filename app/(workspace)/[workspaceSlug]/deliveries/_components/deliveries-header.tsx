"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, AlertTriangle, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import {
  TypographyH1,
  TypographyLead,
  TypographyMuted,
  TypographyKicker,
  TypographySpan,
} from "@/components/ui/typography";
import { createDeliveryAction } from "@/app/actions/deliveries";
import { toast } from "sonner";

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
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
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

    const trimmedTitle = newTitle.trim();
    const res = await createDeliveryAction(
      workspace.id,
      trimmedTitle,
      undefined,
      newClient.trim() || undefined,
      newEmail.trim() || undefined,
      newPhone.trim() || undefined
    );

    if (res?.success && (res.delivery || res.project)) {
      const createdId = res.delivery?.id || res.project?.id;
      toast.success(`Delivery room "${trimmedTitle}" created!`);
      setShowCreateModal(false);
      setNewTitle("");
      setNewClient("");
      setNewEmail("");
      setNewPhone("");
      router.push(`/${workspace.slug}/deliveries/${createdId}`);
    } else {
      const errMsg = res?.error || "Failed to create project delivery room.";
      setErrorMessage(errMsg);
      toast.error(errMsg);
    }
    setCreating(false);
  };

  return (
    <>
      {/* Create Delivery Project Modal using UniversalDialog */}
      <UniversalDialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) {
            setNewTitle("");
            setNewClient("");
            setNewEmail("");
            setNewPhone("");
            setErrorMessage(null);
          }
        }}
        size="md"
        icon={<FolderPlus className="size-5 text-primary" />}
        badge={
          <Badge variant="kicker" className="w-fit">
            NEW REVIEW ROOM
          </Badge>
        }
        title="Create Delivery Workspace"
        description="Set up a dedicated review workspace for your client."
        showCloseButton={!creating}
        bodyClassName="space-y-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={creating}
              onClick={() => setShowCreateModal(false)}
              className="rounded-full text-xs border-white/10 hover:bg-white/5 text-[#aeaeb4] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-delivery-form"
              disabled={creating || isAtLimit}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-full shadow-md disabled:opacity-50 cursor-pointer"
            >
              {creating ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Creating...
                </>
              ) : isAtLimit ? (
                "Plan Limit Reached"
              ) : (
                "Create & Upload Cut"
              )}
            </Button>
          </>
        }
      >
        {isAtLimit && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="size-4 shrink-0" />
              <TypographySpan>
                Delivery Link Limit Reached ({activeCount} / {clientLinksLimit} Active)
              </TypographySpan>
            </div>
            <TypographyMuted className="text-muted-foreground text-[11px] leading-relaxed">
              Your current plan allows up to {clientLinksLimit} active project delivery link{clientLinksLimit > 1 ? "s" : ""}. To create more review rooms, archive an existing project or upgrade your plan.
            </TypographyMuted>
            <div className="pt-1">
              <Button
                asChild
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs h-8 rounded-full"
              >
                <Link href={`/${workspace.slug}/subscription`}>
                  Upgrade Plan (Unlimited Links)
                </Link>
              </Button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form id="create-delivery-form" onSubmit={handleCreateProject} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider ">
              Project Title <TypographySpan className="text-primary">*</TypographySpan>
            </Label>
            <Input
              type="text"
              required
              disabled={isAtLimit || creating}
              placeholder="e.g. Omakase Counter Launch Film"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="text-xs bg-white/[0.04] border-white/10 focus-visible:border-primary/50 text-[#f6f3ec]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider ">
              Client / Brand Name
            </Label>
            <Input
              type="text"
              disabled={isAtLimit || creating}
              placeholder="e.g. Lost in Tokyo Group"
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
              className="text-xs bg-white/[0.04] border-white/10 focus-visible:border-primary/50 text-[#f6f3ec]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider ">
                  Client Email
                </Label>
                <TypographySpan className="text-[10px] text-muted-foreground/60 ">Optional</TypographySpan>
              </div>
              <Input
                type="email"
                disabled={isAtLimit || creating}
                placeholder="client@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="text-xs bg-white/[0.04] border-white/10 focus-visible:border-primary/50 text-[#f6f3ec]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider ">
                  Phone / WhatsApp
                </Label>
                <TypographySpan className="text-[10px] text-muted-foreground/60 ">Optional</TypographySpan>
              </div>
              <Input
                type="tel"
                disabled={isAtLimit || creating}
                placeholder="+1 555 123 4567"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="text-xs bg-white/[0.04] border-white/10 focus-visible:border-primary/50 text-[#f6f3ec]"
              />
            </div>
          </div>
        </form>
      </UniversalDialog>

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <TypographyKicker className="text-xs  text-primary uppercase tracking-wider mb-1 font-semibold block">
            WORKSPACE DASHBOARD
          </TypographyKicker>
          <TypographyH1 className="text-3xl font-bold font-heading text-foreground">
            Client Deliveries
          </TypographyH1>
          <TypographyLead className="text-sm text-muted-foreground mt-1 font-sans">
            Your projects and client review links with video streaming, timecoded feedback, and WhatsApp delivery.
          </TypographyLead>
        </div>

        <div className="flex items-center gap-3">
          {!isUnlimited && (
            <TypographySpan className="text-xs  text-muted-foreground hidden sm:inline px-3 py-1.5 rounded-full border border-border bg-card/60">
              {activeCount} / {clientLinksLimit} active links
            </TypographySpan>
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
