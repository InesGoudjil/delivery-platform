"use client";

import { useState } from "react";
import {
  X,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  updateDeliverySecurityAction,
  verifyPassphraseWithTokenAction,
} from "@/app/actions/deliveries";

interface ShareLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  shareToken: string;
  projectTitle: string;
  initialPasscodeProtected: boolean;
  initialDownloadAllowed: boolean;
  triggerToast: (msg: string) => void;
}

export function ShareLinkDialog({
  isOpen,
  onOpenChange,
  projectId,
  shareToken,
  projectTitle,
  initialPasscodeProtected,
  initialDownloadAllowed,
  triggerToast,
}: ShareLinkDialogProps) {
  const shareUrl = `/deliver/${shareToken}`;

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
  const [shareExpires, setShareExpires] = useState<"24 hours" | "7 days" | "30 days" | "Never">("24 hours");
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyDownloads, setNotifyDownloads] = useState(true);

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
          triggerToast("Passphrase removed. Link is now public.");
        } else {
          triggerToast(res.error || "Failed to disable passphrase.");
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
      triggerToast("Please enter or generate a passphrase first.");
      return;
    }
    setIsSavingSecurity(true);
    try {
      const res = await updateDeliverySecurityAction(projectId, {
        passphrase: sharePassphrase ? passphraseValue.trim() : null,
        isDownloadAllowed: shareDownloads,
      });
      if (res.success) {
        setIsPasscodeSaved(Boolean(res.passcodeProtected));
        setVerificationStatus("valid");
        setVerificationMsg("Passphrase verified and locked with delivery token!");
        triggerToast("Passphrase secured & linked with delivery token!");
      } else {
        triggerToast(res.error || "Failed to save security settings.");
      }
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleVerifyPassphraseWithToken = async () => {
    if (!passphraseValue.trim()) {
      triggerToast("Enter a passphrase to test verification against token.");
      return;
    }
    setIsVerifyingSecurity(true);
    try {
      const res = await verifyPassphraseWithTokenAction(shareToken, passphraseValue);
      if (res.success) {
        setVerificationStatus("valid");
        setVerificationMsg(res.message || "Passphrase verified with token!");
        triggerToast("Verified! Passphrase matches delivery token.");
      } else {
        setVerificationStatus("invalid");
        setVerificationMsg(res.error || "Passphrase does not match token security key. Click 'Save & Lock'.");
        triggerToast(res.error || "Verification mismatch.");
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#141418]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#f5551d] uppercase tracking-wider block">
              Client link
            </span>
            <h3 className="text-lg font-black font-heading tracking-wide uppercase text-white">
              SHARE A LINK
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* URL Input Bar */}
        <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs gap-3">
          <div className="flex items-center gap-2 text-muted-foreground truncate min-w-0 flex-1">
            <Link2 className="size-4 shrink-0 text-[#f5551d]" />
            <span className="font-mono text-white truncate text-[11px]">
              {typeof window !== "undefined" ? window.location.host : "cinespace.film"}{shareUrl}
            </span>
          </div>
          {sharePassphrase && isPasscodeSaved ? (
            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
              <Lock className="size-3 text-amber-400" /> Protected
            </span>
          ) : (
            <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              Public Link
            </span>
          )}
        </div>

        {/* SECURITY */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
                SECURITY
              </span>
              <p className="text-[11px] text-muted-foreground">
                Protect review room with a client access passphrase
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePassphrase(!sharePassphrase)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                sharePassphrase ? "bg-[#f5551d]" : "bg-white/20"
              }`}
              aria-label="Toggle passphrase protection"
            >
              <span
                className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                  sharePassphrase ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Passphrase Input Container */}
          {sharePassphrase && (
            <div className="p-3.5 bg-black/50 border border-[#f5551d]/30 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[#f5551d] flex items-center gap-1.5">
                  <Key className="size-3" /> Client Passphrase
                </span>
                {isPasscodeSaved ? (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <ShieldCheck className="size-3" /> Secured
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="size-3" /> Unsaved changes
                  </span>
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
                  className="w-full bg-[#18181c] border border-white/15 focus:border-[#f5551d] rounded-xl pl-3.5 pr-24 py-2 text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassphraseText(!showPassphraseText)}
                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                    title={showPassphraseText ? "Hide passphrase" : "Show passphrase"}
                  >
                    {showPassphraseText ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={generateRandomPassphrase}
                    className="p-1 rounded-lg hover:bg-white/10 text-[#f5551d] hover:text-[#ff8a45] transition-colors cursor-pointer"
                    title="Generate memorable passphrase"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassphrase}
                    disabled={!passphraseValue}
                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-30"
                    title="Copy passphrase"
                  >
                    {copiedPassphrase ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  </button>
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
                  <span className="truncate">{verificationMsg}</span>
                </div>
              )}

              {/* Save & Verify Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveSecuritySettings}
                  disabled={isSavingSecurity || !passphraseValue.trim()}
                  className="flex-1 bg-[#f5551d] hover:bg-[#ff8a45] disabled:opacity-50 text-black font-extrabold text-[11px] py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#f5551d]/10"
                >
                  {isSavingSecurity ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <Lock className="size-3" />
                  )}
                  {isSavingSecurity ? "SAVING..." : "SAVE & LOCK WITH TOKEN"}
                </button>

                <button
                  type="button"
                  onClick={handleVerifyPassphraseWithToken}
                  disabled={isVerifyingSecurity || !passphraseValue.trim()}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-mono text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10"
                  title="Test verification between token and passphrase"
                >
                  {isVerifyingSecurity ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-3 text-emerald-400" />
                  )}
                  TEST VERIFY
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
                Passphrases are cryptographically hashed (SHA-256) and verified against the delivery share token before client access is granted.
              </p>
            </div>
          )}
        </div>

        {/* PERMISSIONS */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            PERMISSIONS
          </span>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <MessageCircle className="size-4 text-muted-foreground" />
                <span>Comments</span>
              </div>
              <button
                type="button"
                onClick={() => setShareComments(!shareComments)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  shareComments ? "bg-[#f5551d]" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                    shareComments ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <Download className="size-4 text-muted-foreground" />
                <span>Downloads</span>
              </div>
              <button
                type="button"
                onClick={() => setShareDownloads(!shareDownloads)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  shareDownloads ? "bg-[#f5551d]" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                    shareDownloads ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* LINK EXPIRES */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            LINK EXPIRES
          </span>
          <div className="grid grid-cols-4 gap-1 bg-black/60 p-1 rounded-2xl border border-white/10 text-xs">
            {(["24 hours", "7 days", "30 days", "Never"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setShareExpires(opt)}
                className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                  shareExpires === opt
                    ? "bg-[#f5551d] text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* NOTIFY ME WHEN THE CLIENT... */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            NOTIFY ME WHEN THE CLIENT...
          </span>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <MessageCircle className="size-4 text-muted-foreground" />
                <span>Leaves a comment</span>
              </div>
              <button
                type="button"
                onClick={() => setNotifyComments(!notifyComments)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  notifyComments ? "bg-[#f5551d]" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                    notifyComments ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <Download className="size-4 text-muted-foreground" />
                <span>Downloads files</span>
              </div>
              <button
                type="button"
                onClick={() => setNotifyDownloads(!notifyDownloads)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  notifyDownloads ? "bg-[#f5551d]" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 size-4 rounded-full bg-black transition-transform ${
                    notifyDownloads ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
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

          <Button
            type="button"
            onClick={handleCopyLinkWithPassphrase}
            className="rounded-full bg-[#f5551d] hover:bg-[#ff8a45] text-black font-extrabold text-xs py-3 h-auto shadow-lg shadow-[#f5551d]/20 cursor-pointer"
          >
            <Link2 className="size-3.5 mr-1.5" />
            {copiedLink ? "COPIED!" : sharePassphrase && passphraseValue ? "COPY LINK & PASS" : "COPY LINK"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
