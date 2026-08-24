"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Lock,
  Shield,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SecurityPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  const [twoFactor, setTwoFactor] = useState(false);
  const [defaultPassphrase, setDefaultPassphrase] = useState(true);
  const [restrictDownloads, setRestrictDownloads] = useState(false);
  const [watermarkPreviews, setWatermarkPreviews] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      showFlash("Passwords do not match");
      return;
    }
    showFlash("Account password updated successfully");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
          Account
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">
          Security &amp; Passcodes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Protect your filmmaker account and configure default security rules for client delivery rooms.
        </p>
      </div>

      {/* Security Policies / Toggles */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border shadow-sm">
        {/* 2FA */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              Two-Factor Authentication (2FA)
            </div>
            <div className="text-xs text-muted-foreground">
              Require an authenticator app code (TOTP) when logging into your studio.
            </div>
          </div>
          <button
            onClick={() => {
              setTwoFactor(!twoFactor);
              showFlash(!twoFactor ? "2FA enabled" : "2FA disabled");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              twoFactor ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                twoFactor ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Default Passphrase on Links */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              Default Passphrase on Delivery Rooms
            </div>
            <div className="text-xs text-muted-foreground">
              Automatically generate a 6-digit access code for all newly published client review links.
            </div>
          </div>
          <button
            onClick={() => {
              setDefaultPassphrase(!defaultPassphrase);
              showFlash(!defaultPassphrase ? "Default passcodes enabled" : "Default passcodes disabled");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              defaultPassphrase ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                defaultPassphrase ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Restrict Cut Downloads */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              Restrict Raw Master File Downloads
            </div>
            <div className="text-xs text-muted-foreground">
              Prevent clients from downloading ProRes master files until you explicitly check "Approved for Release".
            </div>
          </div>
          <button
            onClick={() => {
              setRestrictDownloads(!restrictDownloads);
              showFlash(!restrictDownloads ? "Download restrictions active" : "Download restrictions removed");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              restrictDownloads ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                restrictDownloads ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Dynamic Watermark */}
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold font-heading text-card-foreground">
              Dynamic Anti-Leak Watermark
            </div>
            <div className="text-xs text-muted-foreground">
              Overlay subtle client email &amp; timestamp watermark across review cuts.
            </div>
          </div>
          <button
            onClick={() => {
              setWatermarkPreviews(!watermarkPreviews);
              showFlash(!watermarkPreviews ? "Watermark protection enabled" : "Watermark protection disabled");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              watermarkPreviews ? "bg-[#f5551d]" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                watermarkPreviews ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-muted border border-border text-foreground">
            <KeyRound className="size-5 text-[#f5551d]" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-card-foreground">
              Change Account Password
            </h3>
            <p className="text-xs text-muted-foreground">
              Ensure your account is using a long, random password.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Current Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPassword ? "Hide passwords" : "Show passwords"}
            </button>

            <Button
              type="submit"
              className="rounded-full text-xs font-semibold bg-primary text-black hover:bg-primary/90 cursor-pointer"
            >
              <Check className="size-3.5 mr-1" /> Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
