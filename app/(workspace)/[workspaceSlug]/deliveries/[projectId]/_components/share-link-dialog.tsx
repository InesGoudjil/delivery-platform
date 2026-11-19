"use client";

import { useState, useEffect } from "react";
import {
  Link2,
  Lock,
  Key,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
  Download,
  Mail,
  Clock,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UniversalDialog, UniversalDialogAction } from "@/components/ui/universal-dialog";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { useOptionalEntitlements } from "@/components/providers/entitlements-provider";
import Link from "next/link";
import {
  updateDeliverySecurityAction,
  verifyPassphraseWithTokenAction,
  sendDeliveryEmailAction,
  sendDeliveryWhatsAppAction,
  regenerateDeliveryShareTokenAction,
} from "@/app/actions/deliveries";
import { toast } from "sonner";
import { generatePassphrase, passcodeProblem } from "@/lib/security/passphrase";
import { EXTENDED_LINK_EXPIRY_MESSAGE, hasExtendedLinkExpiry } from "@/lib/security/link-expiry";

interface ShareLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  shareToken: string;
  projectTitle: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  /** CineSpace's WhatsApp sender is set up (Zoho CPaaS). */
  whatsappAvailable?: boolean;
  initialPasscodeProtected: boolean;
  initialDownloadAllowed: boolean;
  initialCommentAllowed?: boolean;
  initialExpiresAt?: string | null;
  /** The saved "notify me when the client downloads" setting. */
  initialNotifyOnDownload?: boolean;
  /** Admins and owners change the link's settings; other members can only copy and send it. */
  canManage?: boolean;
  onShareTokenRegenerated?: (newToken: string) => void;
  onDownloadAllowedChange?: (allowed: boolean) => void;
  onCommentAllowedChange?: (allowed: boolean) => void;
  triggerToast: (msg: string) => void;
  features?: Record<string, any>;
  workspaceSlug?: string;
}

type ExpiryOption = "24 hours" | "7 days" | "30 days" | "90 days" | "Never";

/** Each option counts from now. `extended`: needs extended link expiry (Pro and up). */
const EXPIRY_OPTIONS: ReadonlyArray<{ option: ExpiryOption; hours: number | null; extended: boolean }> = [
  { option: "24 hours", hours: 24, extended: false },
  { option: "7 days", hours: 7 * 24, extended: false },
  { option: "30 days", hours: 30 * 24, extended: false },
  { option: "90 days", hours: 90 * 24, extended: true },
  { option: "Never", hours: null, extended: true },
];

/**
 * The option to show as picked when the window opens. A saved expiry shows as its date, not as
 * a guess at the option that made it (time has passed since); only "Never" always matches.
 */
function initialExpiryOption(expiresAt?: string | null): ExpiryOption | null {
  return expiresAt ? null : "Never";
}

function calculateExpiresAt(opt: ExpiryOption): string | null {
  const hours = EXPIRY_OPTIONS.find((o) => o.option === opt)?.hours ?? null;
  return hours === null ? null : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function daysLabel(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function ShareLinkDialog({
  isOpen,
  onOpenChange,
  projectId,
  shareToken,
  projectTitle,
  clientEmail: initialClientEmail,
  clientPhone: initialClientPhone,
  whatsappAvailable = false,
  initialPasscodeProtected,
  initialDownloadAllowed,
  initialCommentAllowed = true,
  initialExpiresAt,
  initialNotifyOnDownload = false,
  canManage = true,
  onShareTokenRegenerated,
  onDownloadAllowedChange,
  onCommentAllowedChange,
  triggerToast,
  features,
  workspaceSlug,
}: ShareLinkDialogProps) {
  const [currentToken, setCurrentToken] = useState(shareToken);
  useEffect(() => {
    setCurrentToken(shareToken);
  }, [shareToken]);

  const [expiresAtState, setExpiresAtState] = useState<string | null>(initialExpiresAt ?? null);
  const [shareExpires, setShareExpires] = useState<ExpiryOption | null>(initialExpiryOption(initialExpiresAt));

  useEffect(() => {
    setExpiresAtState(initialExpiresAt ?? null);
    setShareExpires(initialExpiryOption(initialExpiresAt));
  }, [initialExpiresAt]);

  const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);

  const shareUrl = `/deliver/${currentToken}`;

  const entitlements = useOptionalEntitlements();
  const canPasswordProtect = entitlements?.can.passwordProtect ?? (features ? Boolean(features.password_protected) : false);
  const canWhatsApp = entitlements?.can.sendWhatsApp ?? (features ? Boolean(features.whatsapp_delivery) : false);
  const canNotifyDownloads = entitlements?.can.receiveDownloadNotifications ?? (features ? Boolean(features.download_notifications) : false);
  const canExtendExpiry = entitlements?.can.extendedLinkExpiry ?? hasExtendedLinkExpiry(features);

  const [sharePassphrase, setSharePassphrase] = useState(initialPasscodeProtected);
  const [passphraseValue, setPassphraseValue] = useState("");
  const [showPassphraseText, setShowPassphraseText] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);
  const [isPasscodeSaved, setIsPasscodeSaved] = useState(initialPasscodeProtected);
  const [copiedPassphrase, setCopiedPassphrase] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [shareComments, setShareComments] = useState(initialCommentAllowed ?? true);
  const [shareDownloads, setShareDownloads] = useState(initialDownloadAllowed);
  const [isUpdatingComments, setIsUpdatingComments] = useState(false);
  const [isUpdatingDownloads, setIsUpdatingDownloads] = useState(false);
  const [notifyDownloads, setNotifyDownloads] = useState(initialNotifyOnDownload);
  const [isUpdatingNotifyDownloads, setIsUpdatingNotifyDownloads] = useState(false);

  useEffect(() => {
    setNotifyDownloads(initialNotifyOnDownload);
  }, [initialNotifyOnDownload]);

  useEffect(() => {
    setShareComments(initialCommentAllowed ?? true);
  }, [initialCommentAllowed]);

  useEffect(() => {
    setShareDownloads(initialDownloadAllowed);
  }, [initialDownloadAllowed]);

  const handleToggleComments = async (val: boolean) => {
    setShareComments(val);
    onCommentAllowedChange?.(val);
    setIsUpdatingComments(true);
    try {
      const res = await updateDeliverySecurityAction(projectId, {
        isCommentAllowed: val,
      });
      if (res.success) {
        triggerToast(val ? "Client comments enabled" : "Client comments disabled (read-only review)");
      } else {
        toast.error(res.error || "Failed to update comments permission.");
        setShareComments(!val);
        onCommentAllowedChange?.(!val);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update comments permission.");
      setShareComments(!val);
      onCommentAllowedChange?.(!val);
    } finally {
      setIsUpdatingComments(false);
    }
  };

  const handleToggleDownloads = async (val: boolean) => {
    setShareDownloads(val);
    onDownloadAllowedChange?.(val);
    setIsUpdatingDownloads(true);
    try {
      const res = await updateDeliverySecurityAction(projectId, {
        isDownloadAllowed: val,
      });
      if (res.success) {
        triggerToast(val ? "Master deliverables download enabled" : "Downloads restricted (review-only mode)");
      } else {
        toast.error(res.error || "Failed to update download permissions.");
        setShareDownloads(!val);
        onDownloadAllowedChange?.(!val);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update download permissions.");
      setShareDownloads(!val);
      onDownloadAllowedChange?.(!val);
    } finally {
      setIsUpdatingDownloads(false);
    }
  };

  const handleSelectExpiry = async (opt: ExpiryOption) => {
    if (!canManage) return;
    if (EXPIRY_OPTIONS.find((o) => o.option === opt)?.extended && !canExtendExpiry) {
      toast.error(`${EXTENDED_LINK_EXPIRY_MESSAGE} Upgrade to unlock.`);
      return;
    }
    const previousOption = shareExpires;
    const previousExpiresAt = expiresAtState;
    const newExpiresAt = calculateExpiresAt(opt);
    setShareExpires(opt);
    setExpiresAtState(newExpiresAt);
    setIsUpdatingExpiry(true);
    const restore = () => {
      setShareExpires(previousOption);
      setExpiresAtState(previousExpiresAt);
    };
    try {
      const res = await updateDeliverySecurityAction(projectId, {
        expiresAt: newExpiresAt,
      });
      if (res.success) {
        triggerToast(opt === "Never" ? "Link set to never expire" : `Link now expires in ${opt}`);
      } else {
        restore();
        toast.error(res.error || "Failed to update link expiration.");
      }
    } catch (err: any) {
      restore();
      toast.error(err.message || "Failed to update link expiration.");
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  const handleToggleNotifyDownloads = async (val: boolean) => {
    if (!canNotifyDownloads) {
      toast.error("Download notifications are available on Pro and Studio plans.");
      return;
    }
    setNotifyDownloads(val);
    setIsUpdatingNotifyDownloads(true);
    try {
      const res = await updateDeliverySecurityAction(projectId, { notifyOnDownload: val });
      if (res.success) {
        triggerToast(val ? "You'll hear when the client downloads files" : "Download alerts turned off for this link");
      } else {
        setNotifyDownloads(!val);
        toast.error(res.error || "Failed to update download alerts.");
      }
    } catch (err: unknown) {
      setNotifyDownloads(!val);
      toast.error(err instanceof Error && err.message ? err.message : "Failed to update download alerts.");
    } finally {
      setIsUpdatingNotifyDownloads(false);
    }
  };

  const handleRegenerateToken = async () => {
    const confirmed = window.confirm(
      "Regenerating this link will immediately revoke the current link. Any client with the old link will lose access. Proceed?"
    );
    if (!confirmed) return;

    setIsRegeneratingToken(true);
    try {
      const res = await regenerateDeliveryShareTokenAction(projectId);
      if (res.success && res.shareToken) {
        setCurrentToken(res.shareToken);
        onShareTokenRegenerated?.(res.shareToken);
        triggerToast("New delivery link generated! Previous link has been revoked.");
      } else {
        toast.error(res.error || "Failed to regenerate delivery link.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate delivery link.");
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Email Sharing State
  const [clientEmail, setClientEmail] = useState(initialClientEmail || "");
  const [showEmailInput, setShowEmailInput] = useState(Boolean(initialClientEmail));
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (initialClientEmail) {
      setClientEmail(initialClientEmail);
      setShowEmailInput(true);
    }
  }, [initialClientEmail]);

  const handleSendEmail = async () => {
    if (!clientEmail.trim()) {
      toast.error("Please enter a valid client email address.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await sendDeliveryEmailAction(projectId, clientEmail.trim());
      if (res.success) {
        triggerToast(`Review link successfully emailed to ${clientEmail.trim()}!`);
        setShowEmailInput(false);
        setClientEmail("");
      } else {
        toast.error(res.error || "Failed to send email");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // WhatsApp sharing: sent from the CineSpace WhatsApp number, after the client agreed.
  const [clientPhone, setClientPhone] = useState(initialClientPhone || "");
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
  const [whatsAppConsent, setWhatsAppConsent] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  useEffect(() => {
    if (initialClientPhone) setClientPhone(initialClientPhone);
  }, [initialClientPhone]);

  const handleSendWhatsApp = async () => {
    if (!clientPhone.trim()) {
      toast.error("Enter the client's WhatsApp number.");
      return;
    }
    if (!whatsAppConsent) {
      toast.error("Confirm your client agreed to get WhatsApp messages first.");
      return;
    }
    setIsSendingWhatsApp(true);
    try {
      const res = await sendDeliveryWhatsAppAction(projectId, { phone: clientPhone.trim(), clientConsent: true });
      if (res.success) {
        triggerToast(`Review link sent on WhatsApp to ${res.sentTo}`);
        setShowWhatsAppInput(false);
        setWhatsAppConsent(false);
      } else {
        toast.error(res.error || "Couldn't send the WhatsApp message.");
      }
    } catch (err: any) {
      toast.error(err.message || "Couldn't send the WhatsApp message.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const generateRandomPassphrase = () => {
    setPassphraseValue(generatePassphrase());
    setIsPasscodeSaved(false);
    setVerificationStatus("idle");
    setVerificationMsg(null);
  };

  const handleTogglePassphrase = async (enabled: boolean) => {
    if (enabled && !canPasswordProtect) {
      toast.error("Passcode protection is available on Pro and Studio plans. Upgrade to unlock.");
      return;
    }
    setSharePassphrase(enabled);
    setVerificationStatus("idle");
    setVerificationMsg(null);
    if (!enabled) {
      setIsSavingSecurity(true);
      try {
        const res = await updateDeliverySecurityAction(projectId, { passphrase: null });
        if (res.success) {
          setIsPasscodeSaved(false);
          setPassphraseValue("");
          toast.info("Passphrase removed. Link is now public.");
        } else {
          toast.error(res.error || "Failed to disable passphrase.");
        }
      } finally {
        setIsSavingSecurity(false);
      }
    } else {
      if (!passphraseValue) {
        generateRandomPassphrase();
      }
    }
  };

  const handleSaveSecuritySettings = async () => {
    if (sharePassphrase && !passphraseValue.trim()) {
      toast.error("Please enter or generate a passphrase first.");
      return;
    }
    const lengthProblem = sharePassphrase ? passcodeProblem(passphraseValue) : null;
    if (lengthProblem) {
      toast.error(lengthProblem);
      return;
    }
    if (sharePassphrase && !canPasswordProtect) {
      toast.error("Passcode protection is available on Pro and Studio plans. Upgrade to unlock.");
      return;
    }
    setIsSavingSecurity(true);
    try {
      // Only the passcode. The other settings save as soon as they change, and sending the
      // expiry again would restart it from now.
      const res = await updateDeliverySecurityAction(projectId, {
        passphrase: sharePassphrase ? passphraseValue.trim() : null,
      });
      if (res.success) {
        setIsPasscodeSaved(Boolean(res.passcodeProtected));
        setVerificationStatus("valid");
        setVerificationMsg("Passphrase & security verified with delivery token!");
        triggerToast("Passphrase secured & linked with delivery token!");
      } else {
        toast.error(res.error || "Failed to save security settings.");
      }
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleVerifyPassphraseWithToken = async () => {
    if (!passphraseValue.trim()) {
      toast.error("Enter a passphrase to test verification against token.");
      return;
    }
    setIsVerifyingSecurity(true);
    try {
      const res = await verifyPassphraseWithTokenAction(projectId, passphraseValue);
      if (res.success) {
        setVerificationStatus("valid");
        setVerificationMsg(res.message || "Passphrase verified with token!");
        triggerToast("Verified! Passphrase matches delivery token.");
      } else {
        setVerificationStatus("invalid");
        setVerificationMsg(res.error || "Passphrase does not match token security key. Click 'Save & Lock'.");
        toast.error(res.error || "Verification mismatch.");
      }
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  const handleCopyPassphrase = () => {
    if (!passphraseValue) return;
    navigator.clipboard.writeText(passphraseValue);
    setCopiedPassphrase(true);
    triggerToast("Passphrase copied to clipboard");
    setTimeout(() => setCopiedPassphrase(false), 2000);
  };

  const handleCopyLinkWithPassphrase = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${shareUrl}`;
    const text = sharePassphrase && passphraseValue
      ? `Review link: ${url}\nPassphrase: ${passphraseValue}`
      : url;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    triggerToast(sharePassphrase && passphraseValue ? "Link & passphrase copied!" : "Review link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const message = sharePassphrase && passphraseValue
      ? `🎬 Here is your private review link for "${projectTitle}":\n${origin}${shareUrl}\n\n🔐 Passphrase: ${passphraseValue}`
      : `🎬 Here is your review link for "${projectTitle}":\n${origin}${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <UniversalDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      badge={
        <TypographySpan className="text-[11px] font-bold text-primary uppercase tracking-wider block">
          Client link
        </TypographySpan>
      }
      icon={<Share2 className="size-5" />}
      title="Share a Link"
      description="Send a review link to your client, with optional passphrase and expiry."
      bodyClassName="space-y-6"
      footer={
        <>
          {canWhatsApp ? (
            <UniversalDialogAction
              intent="secondary"
              onClick={handleWhatsAppShare}
              icon={<MessageCircle className="text-emerald-400" />}
            >
              Open WhatsApp
            </UniversalDialogAction>
          ) : (
            <UniversalDialogAction
              intent="secondary"
              onClick={() =>
                toast.error(
                  "WhatsApp delivery is available on Basic, Pro, and Studio plans. Upgrade to unlock."
                )
              }
              icon={<MessageCircle />}
              className="opacity-70 cursor-not-allowed"
            >
              WhatsApp <Badge variant="secondary" className="text-[9px] ml-1 py-0 px-1 ">BASIC+</Badge>
            </UniversalDialogAction>
          )}
          <UniversalDialogAction
            intent="primary"
            onClick={handleCopyLinkWithPassphrase}
            icon={copiedLink ? <Check /> : <Link2 />}
          >
            {copiedLink ? "Copied!" : sharePassphrase && passphraseValue ? "Copy Link & Pass" : "Copy Link"}
          </UniversalDialogAction>
        </>
      }
    >
      {/* URL Input Bar */}
        <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs gap-3">
          <div className="flex items-center gap-2 text-muted-foreground truncate min-w-0 flex-1">
            <Link2 className="size-4 shrink-0 text-primary" />
            <TypographySpan className=" text-white truncate text-[11px]">
              {typeof window !== "undefined" ? window.location.host : "cinespace.pro"}{shareUrl}
            </TypographySpan>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleRegenerateToken}
              disabled={isRegeneratingToken || !canManage}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
              title="Regenerate link (revokes the previous link immediately)"
            >
              <RefreshCw className={`size-3.5 ${isRegeneratingToken ? "animate-spin text-primary" : ""}`} />
            </Button>
            {sharePassphrase && isPasscodeSaved ? (
              <TypographySpan className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 ">
                <Lock className="size-3 text-amber-400" /> Protected
              </TypographySpan>
            ) : (
              <TypographySpan className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ">
                Public Link
              </TypographySpan>
            )}
          </div>
        </div>

        {!canManage && (
          <div className="flex items-start gap-2 text-[11px] text-neutral-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
            <Lock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <TypographySpan>
              Only workspace admins can change this link&apos;s settings. You can still copy it and send it.
            </TypographySpan>
          </div>
        )}

        {/* SECURITY */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TypographySpan className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
                  SECURITY
                </TypographySpan>
                <Badge variant="orange" className="text-[9px] px-1.5 py-0 font-bold">
                  PRO
                </Badge>
              </div>
              <TypographyMuted className="text-[11px] text-muted-foreground">
                Protect review room with a client access passphrase
              </TypographyMuted>
              {!canPasswordProtect && (
                <Link
                  href={workspaceSlug ? `/${workspaceSlug}/subscription` : "#"}
                  className="text-[10px] text-primary hover:underline  inline-block mt-0.5"
                >
                  Upgrade to Pro to unlock passcode protection
                </Link>
              )}
            </div>
            <Switch
              disabled={!canPasswordProtect || !canManage}
              checked={sharePassphrase}
              onCheckedChange={(val) => handleTogglePassphrase(val)}
              aria-label="Toggle passphrase protection"
            />
          </div>

          {/* Passphrase Input Container */}
          {sharePassphrase && (
            <div className="p-3.5 bg-black/50 border border-primary/30 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <TypographySpan className="text-[10px]  uppercase font-bold text-primary flex items-center gap-1.5">
                  <Key className="size-3" /> Client Passphrase
                </TypographySpan>
                {isPasscodeSaved ? (
                  <TypographySpan className="text-[10px]  text-emerald-400 flex items-center gap-1 font-bold">
                    <ShieldCheck className="size-3" /> Secured
                  </TypographySpan>
                ) : (
                  <TypographySpan className="text-[10px]  text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="size-3" /> Unsaved changes
                  </TypographySpan>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassphraseText ? "text" : "password"}
                  placeholder="Enter or generate passphrase..."
                  value={passphraseValue}
                  disabled={!canManage}
                  onChange={(e) => {
                    setPassphraseValue(e.target.value);
                    setIsPasscodeSaved(false);
                    setVerificationStatus("idle");
                    setVerificationMsg(null);
                  }}
                  className="w-full bg-[#18181c] border border-white/15 focus:border-primary rounded-xl pl-3.5 pr-24 py-2 text-xs  text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowPassphraseText(!showPassphraseText)}
                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                    title={showPassphraseText ? "Hide passphrase" : "Show passphrase"}
                  >
                    {showPassphraseText ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={generateRandomPassphrase}
                    disabled={!canManage}
                    className="p-1 rounded-lg hover:bg-white/10 text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    title="Generate memorable passphrase"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopyPassphrase}
                    disabled={!passphraseValue}
                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                    title="Copy passphrase"
                  >
                    {copiedPassphrase ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Status verification message */}
              {verificationMsg && (
                <div
                  className={`text-[11px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg  ${
                    verificationStatus === "valid"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {verificationStatus === "valid" ? (
                    <ShieldCheck className="size-3.5 shrink-0" />
                  ) : (
                    <ShieldAlert className="size-3.5 shrink-0" />
                  )}
                  <TypographySpan className="truncate">{verificationMsg}</TypographySpan>
                </div>
              )}

              {/* Save & Verify Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleSaveSecuritySettings}
                  disabled={isSavingSecurity || !passphraseValue.trim() || !canManage}
                  className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-extrabold text-[11px] py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 h-auto"
                >
                  {isSavingSecurity ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <Lock className="size-3" />
                  )}
                  {isSavingSecurity ? "SAVING..." : "SAVE & LOCK WITH TOKEN"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyPassphraseWithToken}
                  disabled={isVerifyingSecurity || !passphraseValue.trim() || !canManage}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white  text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10 h-auto"
                  title="Test verification between token and passphrase"
                >
                  {isVerifyingSecurity ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3 text-emerald-400" />
                  )}
                  TEST VERIFY
                </Button>
              </div>

              <TypographyMuted className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                Passcodes are stored as a one-way hash, so nobody can read this one back once you close this window. Copy it before you go.
              </TypographyMuted>
            </div>
          )}
        </div>

        {/* PERMISSIONS */}
        <div className="space-y-3">
          <TypographySpan className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
            PERMISSIONS
          </TypographySpan>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <MessageCircle className="size-4 text-muted-foreground" />
                <TypographySpan>Comments</TypographySpan>
              </div>
              <Switch
                disabled={isUpdatingComments || !canManage}
                checked={shareComments}
                onCheckedChange={handleToggleComments}
                aria-label="Allow comments"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <Download className="size-4 text-muted-foreground" />
                <TypographySpan>Downloads</TypographySpan>
              </div>
              <Switch
                disabled={isUpdatingDownloads || !canManage}
                checked={shareDownloads}
                onCheckedChange={handleToggleDownloads}
                aria-label="Allow downloads"
              />
            </div>
          </div>
        </div>

        {/* LINK EXPIRES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <TypographySpan className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
                LINK EXPIRES
              </TypographySpan>
              {!canExtendExpiry && (
                <Link
                  href={workspaceSlug ? `/${workspaceSlug}/subscription` : "#"}
                  className="text-[10px] text-primary hover:underline inline-block mt-0.5"
                >
                  Upgrade to Pro for 90-day &amp; permanent links
                </Link>
              )}
            </div>
            {isUpdatingExpiry && (
              <TypographySpan className="text-[10px]  text-primary flex items-center gap-1">
                <RefreshCw className="size-2.5 animate-spin" /> Updating...
              </TypographySpan>
            )}
          </div>

          {/* Active Expiration Status Indicator */}
          {expiresAtState ? (
            new Date(expiresAtState).getTime() < Date.now() ? (
              <div className="flex items-center gap-2 text-[11px] text-amber-300  bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                <Clock className="size-3.5 text-amber-400 shrink-0" />
                <TypographySpan>
                  <strong>Expired on {new Date(expiresAtState).toLocaleDateString()}</strong> · Clients cannot view this cut
                </TypographySpan>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-emerald-300  bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <Clock className="size-3.5 text-emerald-400 shrink-0" />
                <TypographySpan>
                  Active · Expires in{" "}
                  {daysLabel(
                    Math.max(1, Math.ceil((new Date(expiresAtState).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  )}{" "}
                  ({new Date(expiresAtState).toLocaleDateString()})
                </TypographySpan>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-neutral-300  bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <Check className="size-3.5 text-emerald-400 shrink-0" />
              <TypographySpan>Active · Link never expires</TypographySpan>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1 bg-black/60 p-1 rounded-2xl border border-white/10 text-xs">
            {EXPIRY_OPTIONS.map(({ option: opt, extended }) => {
              const isLocked = extended && !canExtendExpiry;
              return (
                <Button
                  key={opt}
                  type="button"
                  variant={shareExpires === opt ? "default" : "ghost"}
                  size="sm"
                  disabled={isUpdatingExpiry || !canManage}
                  onClick={() => handleSelectExpiry(opt)}
                  className={`py-2 px-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer text-center h-auto ${
                    shareExpires === opt
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  } ${isLocked ? "opacity-70" : ""}`}
                  title={isLocked ? "90-day and permanent links need Pro or Studio" : undefined}
                >
                  <span className="flex items-center justify-center gap-1">
                    {opt}
                    {isLocked && <Lock className="size-2.5 text-amber-400" />}
                  </span>
                </Button>
              );
            })}
          </div>
          <TypographyMuted className="text-[10px] text-muted-foreground">
            Each option counts from now.
          </TypographyMuted>
        </div>

        {/* NOTIFY ME WHEN THE CLIENT... */}
        <div className="space-y-3">
          <TypographySpan className="text-[10px]  text-muted-foreground uppercase tracking-widest block">
            NOTIFY ME WHEN THE CLIENT...
          </TypographySpan>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <MessageCircle className="size-4 text-muted-foreground" />
                <TypographySpan>Leaves a comment</TypographySpan>
              </div>
              {/* Comment emails are a workspace setting: there's no per-delivery switch behind this row. */}
              <Link
                href={workspaceSlug ? `/${workspaceSlug}/notifications` : "#"}
                className="text-[11px] text-primary hover:underline shrink-0"
                title="Comment emails are set for the whole workspace"
              >
                Set in Notifications
              </Link>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <Download className="size-4 text-muted-foreground" />
                <div className="flex items-center gap-1.5">
                  <TypographySpan>Downloads files</TypographySpan>
                  <Badge variant="orange" className="text-[9px] px-1.5 py-0 font-bold">
                    PRO
                  </Badge>
                </div>
              </div>
              <Switch
                disabled={!canNotifyDownloads || !canManage || isUpdatingNotifyDownloads}
                checked={canNotifyDownloads && notifyDownloads}
                onCheckedChange={handleToggleNotifyDownloads}
                aria-label="Notify on downloads"
              />
            </div>
          </div>
        </div>

        {/* Email Direct Share */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <TypographySpan className="flex items-center gap-1.5 font-bold text-white">
              <Mail className="size-3.5 text-primary" />
              Email Review Link to Client
            </TypographySpan>
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => setShowEmailInput(!showEmailInput)}
              className="text-[11px]  text-primary hover:underline cursor-pointer p-0 h-auto"
            >
              {showEmailInput ? "Cancel" : "Send Email"}
            </Button>
          </div>
          {showEmailInput && (
            <div className="flex gap-2 pt-1">
              <input
                type="email"
                placeholder="client@company.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendEmail();
                  }
                }}
                className="flex-1 bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <Button
                type="button"
                size="sm"
                disabled={isSendingEmail}
                onClick={handleSendEmail}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs h-auto py-1.5 px-3 rounded-lg cursor-pointer"
              >
                {isSendingEmail ? "Sending..." : "Send"}
              </Button>
            </div>
          )}
        </div>

        {/* WhatsApp Direct Share (from the CineSpace WhatsApp number) */}
        {canWhatsApp && whatsappAvailable && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <TypographySpan className="flex items-center gap-1.5 font-bold text-white">
                <MessageCircle className="size-3.5 text-emerald-400" />
                WhatsApp Review Link to Client
              </TypographySpan>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={() => setShowWhatsAppInput(!showWhatsAppInput)}
                className="text-[11px] text-primary hover:underline cursor-pointer p-0 h-auto"
              >
                {showWhatsAppInput ? "Cancel" : "Send on WhatsApp"}
              </Button>
            </div>
            {showWhatsAppInput && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="+971 50 123 4567"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSendWhatsApp();
                      }
                    }}
                    aria-label="Client WhatsApp number"
                    className="flex-1 bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSendingWhatsApp || !whatsAppConsent}
                    onClick={handleSendWhatsApp}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs h-auto py-1.5 px-3 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    {isSendingWhatsApp ? "Sending..." : "Send"}
                  </Button>
                </div>
                <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsAppConsent}
                    onChange={(e) => setWhatsAppConsent(e.target.checked)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <span>My client agreed to get WhatsApp messages from CineSpace about this delivery.</span>
                </label>
                {sharePassphrase && (
                  <TypographyMuted className="text-[11px] text-amber-300/90">
                    The passphrase isn&apos;t included. Share it with your client separately.
                  </TypographyMuted>
                )}
              </div>
            )}
          </div>
        )}

    </UniversalDialog>
  );
}
