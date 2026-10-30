"use client";

import { useState, useTransition } from "react";
import { KeyRound, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  UniversalDialogRoot,
  UniversalDialogContent,
} from "@/components/ui/universal-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TypographyH2,
  TypographyLead,
  TypographySpan,
} from "@/components/ui/typography";
import { verifyDeliveryPasscodeAction } from "@/app/actions/deliveries";
import type { DeliveryAssetItem } from "./types";

interface DeliveryPasscodeDialogProps {
  isOpen: boolean;
  brandName: string;
  deliveryTitle: string;
  shareToken: string;
  isWorkspaceMember?: boolean;
  onUnlockSuccess: (assets: DeliveryAssetItem[]) => void;
}

export function DeliveryPasscodeDialog({
  isOpen,
  brandName,
  deliveryTitle,
  shareToken,
  isWorkspaceMember = false,
  onUnlockSuccess,
}: DeliveryPasscodeDialogProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, startPasscodeTransition] = useTransition();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);

    if (!passwordInput.trim()) {
      setPasscodeError("Please enter the client passcode.");
      return;
    }

    startPasscodeTransition(async () => {
      const res = await verifyDeliveryPasscodeAction(shareToken, passwordInput);
      if (res.success) {
        onUnlockSuccess((res.assets as DeliveryAssetItem[]) || []);
        toast.success("Access granted to review room");
      } else {
        setPasscodeError(res.error || "Incorrect passcode. Please try again.");
      }
    });
  };

  const handleCreatorUnlock = () => {
    startPasscodeTransition(async () => {
      const res = await verifyDeliveryPasscodeAction(shareToken, "", true);
      if (res.success) {
        onUnlockSuccess((res.assets as DeliveryAssetItem[]) || []);
        toast.success("Unlocked as workspace creator");
      } else {
        toast.error(res.error || "Creator authorization failed");
      }
    });
  };

  return (
    <UniversalDialogRoot open={isOpen} onOpenChange={() => {}}>
      <UniversalDialogContent
        size="md"
        showCloseButton={false}
        overlayClassName="bg-black/90 backdrop-blur-md"
        className="p-6 sm:p-8 w-full max-w-md space-y-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary mx-auto flex items-center justify-center shadow-inner">
          <KeyRound className="size-8" />
        </div>

        <div className="text-center space-y-2">
          <Badge
            variant="outline"
            className="text-[11px] uppercase tracking-wider text-primary border-primary/30"
          >
            Protected Review Room
          </Badge>
          <TypographyH2 className="text-2xl font-bold font-display text-[#f6f3ec]">
            {brandName}
          </TypographyH2>
          <TypographyLead className="text-xs text-[#aeaeb4] font-sans leading-relaxed">
            Enter the client passcode to unlock private delivery cuts for{" "}
            <strong className="text-[#f6f3ec]">{deliveryTitle}</strong>.
          </TypographyLead>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <div className="relative">
              <Input
                type={showPasscode ? "text" : "password"}
                placeholder="Enter client passcode"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-center text-sm rounded-xl py-6 px-10 focus-visible:border-primary text-white placeholder:text-neutral-500 tracking-wider"
                autoFocus
                disabled={isVerifyingPasscode}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-7 text-neutral-400 hover:text-white cursor-pointer p-1 z-10"
                title={showPasscode ? "Hide passcode" : "Show passcode"}
              >
                {showPasscode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {passcodeError && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 mt-2 font-medium">
                <AlertCircle className="size-3.5" />
                <TypographySpan>{passcodeError}</TypographySpan>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isVerifyingPasscode}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <ShieldCheck className="size-4" />
            {isVerifyingPasscode ? "Verifying..." : "Unlock Review Room"}
          </Button>
        </form>

        {isWorkspaceMember && (
          <div className="pt-3 border-t border-white/10 text-center">
            <Button
              type="button"
              variant="link"
              onClick={handleCreatorUnlock}
              disabled={isVerifyingPasscode}
              className="text-[11px] text-primary hover:underline cursor-pointer transition-colors h-auto p-0"
            >
              Workspace Creator: Quick Unlock Preview
            </Button>
          </div>
        )}

        <p className="text-[11px] text-[#5e5e64] text-center">
          Delivery Token: {shareToken.slice(0, 8)}...
        </p>
      </UniversalDialogContent>
    </UniversalDialogRoot>
  );
}
