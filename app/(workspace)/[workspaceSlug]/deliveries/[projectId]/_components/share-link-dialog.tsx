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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UniversalDialog } from "@/components/ui/universal-dialog";
import { TypographyMuted, TypographySpan } from "@/components/ui/typography";
import Link from "next/link";
import {
  updateDeliverySecurityAction,
  verifyPassphraseWithTokenAction,
  sendDeliveryEmailAction,
  regenerateDeliveryShareTokenAction,
} from "@/app/actions/deliveries";
import { toast } from "sonner";

interface ShareLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  shareToken: string;
  projectTitle: string;
  clientEmail?: string | null;
  initialPasscodeProtected: boolean;
  initialDownloadAllowed: boolean;
  initialExpiresAt?: string | null;
  onShareTokenRegenerated?: (newToken: string) => void;
  triggerToast: (msg: string) => void;
  features?: Record<string, any>;
  workspaceSlug?: string;
}

function getInitialExpiryOption(expiresAt?: string | null): "24 hours" | "7 days" | "30 days" | "Never" {
  if (!expiresAt) return "Never";
  const diffHours = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours <= 0) return "24 hours";
  if (diffHours <= 36) return "24 hours";
  if (diffHours <= 8 * 24) return "7 days";
  return "30 days";
}

function calculateExpiresAt(opt: "24 hours" | "7 days" | "30 days" | "Never"): string | null {
  if (opt === "Never") return null;
  const now = Date.now();
  if (opt === "24 hours") return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  if (opt === "7 days") return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (opt === "30 days") return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

export function ShareLinkDialog({
  isOpen,
  onOpenChange,
  projectId,
  shareToken,
  projectTitle,
  clientEmail: initialClientEmail,
  initialPasscodeProtected,
  initialDownloadAllowed,
  initialExpiresAt,
  onShareTokenRegenerated,
  triggerToast,
  features,
  workspaceSlug,
}: ShareLinkDialogProps) {
  const [currentToken, setCurrentToken] = useState(shareToken);
  useEffect(() => {
    setCurrentToken(shareToken);
  }, [shareToken]);

  const [expiresAtState, setExpiresAtState] = useState<string | null>(initialExpiresAt ?? null);
  const [shareExpires, setShareExpires] = useState<"24 hours" | "7 days" | "30 days" | "Never">(
    getInitialExpiryOption(initialExpiresAt)
  );

  useEffect(() => {
    setExpiresAtState(initialExpiresAt ?? null);
    setShareExpires(getInitialExpiryOption(initialExpiresAt));
  }, [initialExpiresAt]);

  const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);

  const shareUrl = `/deliver/${currentToken}`;

  const canPasswordProtect = features ? Boolean(features.password_protected) : false;
  const canWhatsApp = features ? Boolean(features.whatsapp_delivery) : false;
  const canNotifyDownloads = features ? Boolean(features.download_notifications) : false;

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

  const [shareComments, setShareComments] = useState(true);
  const [shareDownloads, setShareDownloads] = useState(initialDownloadAllowed);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyDownloads, setNotifyDownloads] = useState(true);

  const handleSelectExpiry = async (opt: "24 hours" | "7 days" | "30 days" | "Never") => {
    setShareExpires(opt);
    const newExpiresAt = calculateExpiresAt(opt);
    setExpiresAtState(newExpiresAt);
    setIsUpdatingExpiry(true);
    try {
      const res = await updateDeliverySecurityAction(projectId, {
        expiresAt: newExpiresAt,
      });
      if (res.success) {
        triggerToast(opt === "Never" ? "Link set to never expire" : `Link expiration updated to ${opt}`);
      } else {
        toast.error(res.error || "Failed to update link expiration.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update link expiration.");
    } finally {
      setIsUpdatingExpiry(false);
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

  const generateRandomPassphrase = () => {
    const adjectives = ["golden", "desert", "cinematic", "lunar", "swift", "hyper", "velvet", "stellar"];
    const nouns = ["falcon", "frame", "dune", "lens", "shadow", "reel", "apex", "cut"];
    const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const generated = `${randAdj}-${randNoun}-${randNum}`;
    setPassphraseValue(generated);
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
    if (sharePassphrase && !canPasswordProtect) {
      toast.error("Passcode protection is available on Pro and Studio plans. Upgrade to unlock.");
      return;
    }
    setIsSavingSecurity(true);
    try {
      const currentExpiryDate = calculateExpiresAt(shareExpires);
      const res = await updateDeliverySecurityAction(projectId, {
        passphrase: sharePassphrase ? passphraseValue.trim() : null,
        isDownloadAllowed: shareDownloads,
        notifyOnDownload: canNotifyDownloads ? notifyDownloads : false,
        expiresAt: currentExpiryDate,
      });
      if (res.success) {
        setExpiresAtState(currentExpiryDate);
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
      const res = await verifyPassphraseWithTokenAction(currentToken, passphraseValue);
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
      title="SHARE A LINK"
      bodyClassName="space-y-6"
    >
      {/* URL Input Bar */}
        <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs gap-3">
          <div className="flex items-center gap-2 text-muted-foreground truncate min-w-0 flex-1">
            <Link2 className="size-4 shrink-0 text-primary" />
            <TypographySpan className="font-mono text-white truncate text-[11px]">
              {typeof window !== "undefined" ? window.location.host : "cinespace.film"}{shareUrl}
            </TypographySpan>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleRegenerateToken}
              disabled={isRegeneratingToken}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
              title="Regenerate link (revokes the previous link immediately)"
            >
              <RefreshCw className={`size-3.5 ${isRegeneratingToken ? "animate-spin text-primary" : ""}`} />
            </Button>
            {sharePassphrase && isPasscodeSaved ? (
              <TypographySpan className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                <Lock className="size-3 text-amber-400" /> Protected
              </TypographySpan>
            ) : (
              <TypographySpan className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Public Link
              </TypographySpan>
            )}
          </div>
        </div>

        {/* SECURITY */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TypographySpan className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
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
                  className="text-[10px] text-primary hover:underline font-mono inline-block mt-0.5"
                >
                  Upgrade to Pro to unlock passcode protection
                </Link>
              )}
            </div>
            <Switch
              disabled={!canPasswordProtect}
              checked={sharePassphrase}
              onCheckedChange={(val) => handleTogglePassphrase(val)}
              aria-label="Toggle passphrase protection"
            />
          </div>

          {/* Passphrase Input Container */}
          {sharePassphrase && (
            <div className="p-3.5 bg-black/50 border border-primary/30 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <TypographySpan className="text-[10px] font-mono uppercase font-bold text-primary flex items-center gap-1.5">
                  <Key className="size-3" /> Client Passphrase
                </TypographySpan>
                {isPasscodeSaved ? (
                  <TypographySpan className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <ShieldCheck className="size-3" /> Secured
                  </TypographySpan>
                ) : (
                  <TypographySpan className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="size-3" /> Unsaved changes
                  </TypographySpan>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassphraseText ? "text" : "password"}
                  placeholder="Enter or generate passphrase..."
                  value={passphraseValue}
                  onChange={(e) => {
                    setPassphraseValue(e.target.value);
                    setIsPasscodeSaved(false);
                    setVerificationStatus("idle");
                    setVerificationMsg(null);
                  }}
                  className="w-full bg-[#18181c] border border-white/15 focus:border-primary rounded-xl pl-3.5 pr-24 py-2 text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
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
                  className={`text-[11px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono ${
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
                  disabled={isSavingSecurity || !passphraseValue.trim()}
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
                  disabled={isVerifyingSecurity || !passphraseValue.trim()}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-mono text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10 h-auto"
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
                Passphrases are cryptographically hashed (SHA-256) and verified against the delivery share token before client access is granted.
              </TypographyMuted>
            </div>
          )}
        </div>

        {/* PERMISSIONS */}
        <div className="space-y-3">
          <TypographySpan className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            PERMISSIONS
          </TypographySpan>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <MessageCircle className="size-4 text-muted-foreground" />
                <TypographySpan>Comments</TypographySpan>
              </div>
              <Switch
                checked={shareComments}
                onCheckedChange={setShareComments}
                aria-label="Allow comments"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <Download className="size-4 text-muted-foreground" />
                <TypographySpan>Downloads</TypographySpan>
              </div>
              <Switch
                checked={shareDownloads}
                onCheckedChange={setShareDownloads}
                aria-label="Allow downloads"
              />
            </div>
          </div>
        </div>

        {/* LINK EXPIRES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <TypographySpan className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              LINK EXPIRES
            </TypographySpan>
            {isUpdatingExpiry && (
              <TypographySpan className="text-[10px] font-mono text-primary flex items-center gap-1">
                <RefreshCw className="size-2.5 animate-spin" /> Updating...
              </TypographySpan>
            )}
          </div>

          {/* Active Expiration Status Indicator */}
          {expiresAtState ? (
            new Date(expiresAtState).getTime() < Date.now() ? (
              <div className="flex items-center gap-2 text-[11px] text-amber-300 font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                <Clock className="size-3.5 text-amber-400 shrink-0" />
                <TypographySpan>
                  <strong>Expired on {new Date(expiresAtState).toLocaleDateString()}</strong> · Clients cannot view this cut
                </TypographySpan>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <Clock className="size-3.5 text-emerald-400 shrink-0" />
                <TypographySpan>
                  Active · Expires in{" "}
                  {Math.max(
                    1,
                    Math.ceil((new Date(expiresAtState).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  )}{" "}
                  days ({new Date(expiresAtState).toLocaleDateString()})
                </TypographySpan>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-neutral-300 font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <Check className="size-3.5 text-emerald-400 shrink-0" />
              <TypographySpan>Active · Link never expires</TypographySpan>
            </div>
          )}

          <div className="grid grid-cols-4 gap-1 bg-black/60 p-1 rounded-2xl border border-white/10 text-xs">
            {(["24 hours", "7 days", "30 days", "Never"] as const).map((opt) => (
              <Button
                key={opt}
                type="button"
                variant={shareExpires === opt ? "default" : "ghost"}
                size="sm"
                disabled={isUpdatingExpiry}
                onClick={() => handleSelectExpiry(opt)}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center h-auto ${
                  shareExpires === opt
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>

        {/* NOTIFY ME WHEN THE CLIENT... */}
        <div className="space-y-3">
          <TypographySpan className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            NOTIFY ME WHEN THE CLIENT...
          </TypographySpan>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <MessageCircle className="size-4 text-muted-foreground" />
                <TypographySpan>Leaves a comment</TypographySpan>
              </div>
              <Switch
                checked={notifyComments}
                onCheckedChange={setNotifyComments}
                aria-label="Notify on comments"
              />
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
                disabled={!canNotifyDownloads}
                checked={canNotifyDownloads && notifyDownloads}
                onCheckedChange={(val) => {
                  if (!canNotifyDownloads) {
                    toast.error("Download notifications are available on Pro and Studio plans.");
                    return;
                  }
                  setNotifyDownloads(val);
                }}
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
              className="text-[11px] font-mono text-primary hover:underline cursor-pointer p-0 h-auto"
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {canWhatsApp ? (
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/20 bg-black/40 hover:bg-white/10 text-white font-extrabold text-xs py-3 h-auto cursor-pointer"
            >
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  sharePassphrase && passphraseValue
                    ? `🎬 Here is your private review link for "${projectTitle}":\n${
                        typeof window !== "undefined" ? window.location.origin : ""
                      }${shareUrl}\n\n🔐 Passphrase: ${passphraseValue}`
                    : `🎬 Here is your review link for "${projectTitle}":\n${
                        typeof window !== "undefined" ? window.location.origin : ""
                      }${shareUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-3.5 mr-1.5 text-emerald-400" />
                SEND ON WHATSAPP
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                toast.error(
                  "WhatsApp delivery is available on Basic, Pro, and Studio plans. Upgrade to unlock."
                )
              }
              className="rounded-full border-white/10 bg-black/20 text-muted-foreground font-extrabold text-xs py-3 h-auto opacity-70 cursor-not-allowed"
            >
              <MessageCircle className="size-3.5 mr-1.5 text-muted-foreground" />
              WHATSAPP <Badge variant="secondary" className="text-[9px] ml-1.5 py-0 px-1 font-mono">BASIC+</Badge>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleCopyLinkWithPassphrase}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs py-3 h-auto shadow-lg shadow-primary/20 cursor-pointer"
          >
            <Link2 className="size-3.5 mr-1.5" />
            {copiedLink ? "COPIED!" : sharePassphrase && passphraseValue ? "COPY LINK & PASS" : "COPY LINK"}
          </Button>
        </div>
    </UniversalDialog>
  );
}
