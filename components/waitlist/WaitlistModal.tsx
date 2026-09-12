"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  Users,
  ArrowRight,
  Loader2,
  X,
  Search,
} from "lucide-react";
import {
  joinWaitlistAction,
  checkWaitlistStatusAction,
  WaitlistActionState,
} from "@/app/actions/waitlist";

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReferralCode?: string;
}

export function WaitlistModal({
  isOpen,
  onClose,
  initialReferralCode = "",
}: WaitlistModalProps) {
  const [tab, setTab] = useState<"join" | "status">("join");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<WaitlistActionState | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);

  // Status check state
  const [statusEmail, setStatusEmail] = useState("");

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await joinWaitlistAction(null, formData);
      setResult(res);
    });
  };

  const handleCheckStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await checkWaitlistStatusAction(statusEmail);
      setResult(res);
    });
  };

  const referralLink =
    typeof window !== "undefined" && result?.data?.referralCode
      ? `${window.location.origin}?ref=${result.data.referralCode}`
      : "";

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `I just joined the waitlist for Cut Delivery Platform! Grab early access with my link:`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on the waitlist for Cut Delivery Platform: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e0e12] p-6 text-[#f6f3ec] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Header Tabs */}
        {!result?.data ? (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#f5551d] mb-2">
              <Sparkles className="size-4" />
              <span>Early Beta Access</span>
            </div>
            <h2 className="text-2xl font-bold font-heading">
              Join the Priority Waitlist
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Be the first to experience lightning-fast delivery and review workflows.
            </p>

            <div className="mt-4 flex rounded-lg bg-white/5 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setTab("join");
                  setResult(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  tab === "join"
                    ? "bg-[#f5551d] text-white shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Join Waitlist
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("status");
                  setResult(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  tab === "status"
                    ? "bg-[#f5551d] text-white shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Check My Spot
              </button>
            </div>
          </div>
        ) : null}

        {/* Error message */}
        {result?.error ? (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {result.error}
          </div>
        ) : null}

        {/* Tab 1: Join Waitlist Form */}
        {!result?.data && tab === "join" && (
          <form onSubmit={handleJoin} className="space-y-4">
            {/* Honeypot hidden input */}
            <div style={{ display: "none" }}>
              <input
                type="text"
                name="hp_field"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {referralCode && (
              <input type="hidden" name="referralCode" value={referralCode} />
            )}

            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5">
                Work Email *
              </label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#f5551d] focus:outline-none focus:ring-1 focus:ring-[#f5551d] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Your Role
                </label>
                <select
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-xs text-white focus:border-[#f5551d] focus:outline-none transition-colors"
                >
                  <option value="">Select role...</option>
                  <option value="editor">Video Editor</option>
                  <option value="director">Creative Director</option>
                  <option value="agency">Agency Founder</option>
                  <option value="post_supervisor">Post Supervisor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Team Size
                </label>
                <select
                  name="companySize"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-xs text-white focus:border-[#f5551d] focus:outline-none transition-colors"
                >
                  <option value="">Select size...</option>
                  <option value="1">Solo / Freelancer</option>
                  <option value="2-10">2-10 team members</option>
                  <option value="11-50">11-50 team members</option>
                  <option value="50+">50+ team members</option>
                </select>
              </div>
            </div>

            {referralCode && (
              <div className="rounded-lg bg-white/5 border border-white/10 p-2.5 text-xs text-[#f5551d] flex items-center gap-2">
                <Users className="size-4" />
                <span>Referred with priority code: <strong>{referralCode}</strong></span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#f5551d] py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#e04a16] transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Securing your spot...</span>
                </>
              ) : (
                <>
                  <span>Request Priority Access</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Check Status Form */}
        {!result?.data && tab === "status" && (
          <form onSubmit={handleCheckStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5">
                Enter your registered email
              </label>
              <input
                type="email"
                required
                value={statusEmail}
                onChange={(e) => setStatusEmail(e.target.value)}
                placeholder="you@studio.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#f5551d] focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  <span>Check Status</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Success / Position Result View */}
        {result?.data && (
          <div className="py-2 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#f5551d]/10 text-[#f5551d] border border-[#f5551d]/20">
              <Sparkles className="size-7" />
            </div>

            <h3 className="text-xl font-bold font-heading">
              {result.data.status === "invited"
                ? "You Have Been Invited! 🎉"
                : "You're On The Waitlist!"}
            </h3>

            {result.data.status === "invited" ? (
              <p className="mt-1 text-sm text-white/70">
                Check your inbox! We sent you an activation link to register.
              </p>
            ) : (
              <>
                <div className="my-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Your Queue Position
                  </div>
                  <div className="mt-1 text-4xl font-extrabold text-[#f5551d] tracking-tight">
                    #{result.data.position}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    ahead of {Math.max(0, result.data.totalPending - result.data.position)} people in line
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <label className="block text-xs font-semibold text-white/80">
                    Bump up in line with your personal referral link:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/90 font-mono select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 rounded-xl bg-[#f5551d] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#e04a16] transition-colors"
                    >
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Each friend who joins bumps you <strong>10 spots forward</strong>. (Current referrals: {result.data.referralCount})
                  </p>

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={shareOnTwitter}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Share on X
                    </button>
                    <button
                      type="button"
                      onClick={shareOnLinkedIn}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Share on LinkedIn
                    </button>
                    <button
                      type="button"
                      onClick={shareOnWhatsApp}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  onClose();
                }}
                className="text-xs text-white/50 hover:text-white transition-colors"
              >
                Close & Return
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
