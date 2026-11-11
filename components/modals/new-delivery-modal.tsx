"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FolderPlus, AlertTriangle, Loader2 } from "lucide-react";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { createDeliveryAction } from "@/app/actions/deliveries";
import { useOptionalEntitlements } from "@/components/providers/entitlements-provider";
import { toast } from "sonner";

export interface NewDeliveryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: {
    id: string;
    brandName: string;
    slug: string;
  };
  features?: Record<string, any>;
  activeCount?: number;
}

export function NewDeliveryModal({
  isOpen,
  onOpenChange,
  workspace,
  features,
  activeCount = 0,
}: NewDeliveryModalProps) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const entitlements = useOptionalEntitlements();
  const clientLinksLimit =
    entitlements?.limits.clientLinksMax ?? features?.client_links ?? 1;
  const isUnlimited = clientLinksLimit === -1;
  const isAtLimit = !isUnlimited && activeCount >= clientLinksLimit;

  const handleCreate = async (e: React.FormEvent) => {
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
      newEmail.trim() || undefined
    );

    setCreating(false);

    if (res.error) {
      setErrorMessage(res.error);
      toast.error(res.error);
      return;
    }

    if (res.delivery) {
      toast.success("Delivery created successfully!");
      setNewTitle("");
      setNewClient("");
      setNewEmail("");
      setNewPhone("");
      onOpenChange(false);
      router.push(`/${workspace.slug}/deliveries/${res.delivery.id}`);
    }
  };

  return (
    <UniversalDialog
      open={isOpen}
      onOpenChange={(open) => !creating && onOpenChange(open)}
      size="md"
      variant="default"
      icon={<FolderPlus className="size-5" />}
      title="Create New Delivery"
      description="Set up a private delivery room for client review and master cut delivery."
      showCloseButton={!creating}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => onOpenChange(false)}
            className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold px-4 py-2 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="new-delivery-form"
            disabled={creating || isAtLimit}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 py-2 flex items-center gap-1.5 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <TypographySpan>Creating...</TypographySpan>
              </>
            ) : (
              <>
                <FolderPlus className="size-3.5" />
                <TypographySpan>Create Delivery</TypographySpan>
              </>
            )}
          </Button>
        </>
      }
    >
      <form id="new-delivery-form" onSubmit={handleCreate} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <TypographySpan>{errorMessage}</TypographySpan>
          </div>
        )}

        {isAtLimit && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              <TypographySpan className="font-semibold block">
                Active Client Links Limit Reached ({clientLinksLimit}/{clientLinksLimit})
              </TypographySpan>
              <TypographyMuted className="text-zinc-300 text-xs">
                Your current plan only permits up to {clientLinksLimit} active delivery{" "}
                {clientLinksLimit === 1 ? "room" : "rooms"}. Upgrade to create unlimited deliveries.
              </TypographyMuted>
              <Link
                href={`/${workspace.slug}/subscription`}
                onClick={() => onOpenChange(false)}
                className="inline-block pt-1 text-xs font-medium text-amber-400 hover:text-amber-300 underline"
              >
                Upgrade Plan &rarr;
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="delivery-title" className="text-xs font-medium text-zinc-300">
            Project / Delivery Title <TypographySpan className="text-red-400">*</TypographySpan>
          </Label>
          <Input
            id="delivery-title"
            placeholder="e.g. Nike Summer Commercial"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={creating || isAtLimit}
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-name" className="text-xs font-medium text-zinc-300">
            Client or Brand Name (Optional)
          </Label>
          <Input
            id="client-name"
            placeholder="e.g. Nike Global"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            disabled={creating || isAtLimit}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="client-email" className="text-xs font-medium text-zinc-300">
              Client Email (Optional)
            </Label>
            <Input
              id="client-email"
              type="email"
              placeholder="client@brand.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={creating || isAtLimit}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-phone" className="text-xs font-medium text-zinc-300">
              Client Phone (Optional)
            </Label>
            <Input
              id="client-phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              disabled={creating || isAtLimit}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus:border-primary"
            />
          </div>
        </div>
      </form>
    </UniversalDialog>
  );
}
