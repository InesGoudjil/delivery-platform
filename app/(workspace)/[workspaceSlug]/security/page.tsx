"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import {
  Lock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  AlertCircle,
  Loader2,
  Copy,
  LogOut,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TypographyH1,
  TypographyH3,
  TypographyLead,
  TypographyMuted,
  TypographyKicker,
  TypographySmall,
  TypographySpan,
} from "@/components/ui/typography";
import { createClient } from "@/lib/supabase/client";
import { changePasswordAction } from "@/app/actions/auth";
import {
  getWorkspaceSettingsAction,
  updateWorkspaceSecuritySettingsAction,
} from "@/app/actions/settings";

interface TOTPEnrollData {
  id: string;
  type: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

const EXPIRATION_OPTIONS = [
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "30 Days (Standard)" },
  { value: 90, label: "90 Days" },
  { value: null, label: "Never Expire" },
];

export default function SecurityPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";
  const supabase = createClient();

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const [isLoading2FA, setIsLoading2FA] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<TOTPEnrollData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Link Expiration State
  const [expirationDays, setExpirationDays] = useState<number | null>(30);
  const [isSavingExpiration, setIsSavingExpiration] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Session state
  const [deviceInfo, setDeviceInfo] = useState<{ browser: string; os: string } | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);

  // Load 2FA status, user session info, and workspace settings
  useEffect(() => {
    let mounted = true;

    async function loadSecurityData() {
      try {
        // 1. Check Supabase MFA Factors
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = factorsData?.totp?.find((f) => f.status === "verified");

        if (mounted) {
          if (verifiedFactor) {
            setIs2FAEnabled(true);
            setActiveFactorId(verifiedFactor.id);
          } else {
            setIs2FAEnabled(false);
            setActiveFactorId(null);
          }
          setIsLoading2FA(false);
        }

        // 2. Fetch User & Device Info
        const { data: userData } = await supabase.auth.getUser();
        if (mounted && userData.user) {
          if (userData.user.last_sign_in_at) {
            setLastSignIn(new Date(userData.user.last_sign_in_at).toLocaleString());
          }

          // Parse browser & OS from navigator
          if (typeof window !== "undefined") {
            const ua = window.navigator.userAgent;
            let browser = "Web Browser";
            if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Google Chrome";
            else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Apple Safari";
            else if (ua.includes("Firefox")) browser = "Mozilla Firefox";
            else if (ua.includes("Edg")) browser = "Microsoft Edge";

            let os = "Desktop";
            if (ua.includes("Mac OS")) os = "macOS";
            else if (ua.includes("Windows")) os = "Windows";
            else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
            else if (ua.includes("Android")) os = "Android";
            else if (ua.includes("Linux")) os = "Linux";

            setDeviceInfo({ browser, os });
          }
        }

        // 3. Fetch Workspace Link Expiration Defaults
        const settingsRes = await getWorkspaceSettingsAction(workspaceSlug);
        if (mounted && settingsRes.success && settingsRes.data) {
          setExpirationDays(settingsRes.data.defaultLinkExpirationDays ?? null);
        }
      } catch (err) {
        console.warn("[SecurityPage] Error loading security data:", err);
        if (mounted) setIsLoading2FA(false);
      }
    }

    loadSecurityData();
    return () => {
      mounted = false;
    };
  }, [workspaceSlug, supabase]);

  // Start 2FA Enrollment Flow
  const handleStart2FAEnrollment = async () => {
    try {
      setIsEnrolling(true);
      setVerifyError(null);
      setVerifyCode("");

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "CineSpace",
      });

      if (error) {
        toast.error(error.message || "Failed to initialize 2FA enrollment");
        setIsEnrolling(false);
        return;
      }

      setEnrollData(data as TOTPEnrollData);
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize 2FA enrollment");
      setIsEnrolling(false);
    }
  };

  // Verify code and complete 2FA activation
  const handleVerify2FACode = async () => {
    if (!enrollData || !verifyCode.trim()) {
      setVerifyError("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmittingCode(true);
    setVerifyError(null);

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollData.id,
        code: verifyCode.trim(),
      });

      if (error) {
        setVerifyError(error.message || "Invalid verification code. Please try again.");
        setIsSubmittingCode(false);
        return;
      }

      toast.success("Two-Factor Authentication is now enabled on your account.");
      setIs2FAEnabled(true);
      setActiveFactorId(enrollData.id);
      setIsEnrolling(false);
      setEnrollData(null);
      setVerifyCode("");
    } catch (err: any) {
      setVerifyError(err.message || "Failed to verify code.");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!activeFactorId) return;

    if (!confirm("Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.")) {
      return;
    }

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: activeFactorId,
      });

      if (error) {
        toast.error(error.message || "Failed to disable 2FA");
        return;
      }

      toast.success("Two-Factor Authentication has been disabled.");
      setIs2FAEnabled(false);
      setActiveFactorId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA");
    }
  };

  const handleCopySecret = () => {
    if (!enrollData?.totp?.secret) return;
    navigator.clipboard.writeText(enrollData.totp.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success("Secret copied to clipboard");
  };

  // Update Link Expiration
  const handleSelectExpiration = async (days: number | null) => {
    setExpirationDays(days);
    setIsSavingExpiration(true);

    const res = await updateWorkspaceSecuritySettingsAction(workspaceSlug, {
      defaultLinkExpirationDays: days,
    });

    setIsSavingExpiration(false);
    if (res.success) {
      toast.success("Default link expiration policy updated");
    } else {
      toast.error(res.error || "Failed to save link expiration policy");
    }
  };

  // Sign out other sessions
  const handleSignOutOtherSessions = async () => {
    setIsSigningOutOthers(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) {
        toast.error(error.message || "Failed to sign out other sessions");
      } else {
        toast.success("All other active sessions have been signed out.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign out other sessions");
    } finally {
      setIsSigningOutOthers(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!currentPassword || !newPassword) {
      setFormError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setFormError("New password must be at least 8 characters long.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await changePasswordAction(null, formData);
      if (res?.error) {
        setFormError(res.error);
        toast.error(res.error);
      } else if (res?.success) {
        toast.success(res.success);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <TypographyKicker className="text-xs text-primary uppercase tracking-wider mb-1 block">
          Studio Settings
        </TypographyKicker>
        <TypographyH1 className="text-3xl font-bold font-heading text-foreground">
          Security &amp; Access Governance
        </TypographyH1>
        <TypographyLead className="text-sm text-muted-foreground mt-1">
          Manage your authentication credentials, active sessions, and studio delivery link defaults.
        </TypographyLead>
      </div>

      {/* 1. Account Authentication (2FA & Password) */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-8 shadow-sm">
        {/* 2FA Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-muted border border-border text-foreground">
                <Smartphone className="size-4 text-primary" />
              </div>
              <TypographyH3 className="text-base font-bold font-heading text-card-foreground">
                Two-Factor Authentication (2FA)
              </TypographyH3>
              {is2FAEnabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              )}
            </div>
            <TypographyMuted className="text-xs text-muted-foreground max-w-md">
              Secure your account using an authenticator app (Google Authenticator, Apple Passwords, or 1Password) with time-based one-time codes (TOTP).
            </TypographyMuted>
          </div>

          <div>
            {isLoading2FA ? (
              <Button disabled variant="outline" size="sm" className="rounded-xl text-xs">
                <Loader2 className="size-3 mr-1.5 animate-spin" /> Checking...
              </Button>
            ) : is2FAEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisable2FA}
                className="rounded-xl text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStart2FAEnrollment}
                className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <ShieldCheck className="size-3.5 mr-1.5" /> Setup 2FA
              </Button>
            )}
          </div>
        </div>

        {/* Password Change Form */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted border border-border text-foreground">
              <KeyRound className="size-4 text-primary" />
            </div>
            <div>
              <TypographyH3 className="font-heading text-base font-bold text-card-foreground">
                Change Account Password
              </TypographyH3>
              <TypographyMuted className="text-xs text-muted-foreground">
                Ensure your account is using a long, random password.
              </TypographyMuted>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md pt-2">
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <TypographySpan className="leading-snug">{formError}</TypographySpan>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Current Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isPending}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={isPending}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                disabled={isPending}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer h-auto py-1 px-2"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showPassword ? "Hide passwords" : "Show passwords"}
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 mr-1 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5 mr-1" /> Update Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Studio Link Governance: Default Link Lifespan */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted border border-border text-foreground">
            <Calendar className="size-4 text-primary" />
          </div>
          <div>
            <TypographyH3 className="font-heading text-base font-bold text-card-foreground">
              Default Delivery Link Lifespan
            </TypographyH3>
            <TypographyMuted className="text-xs text-muted-foreground">
              Automatically assigns an expiration date to newly created review links to prevent stale links from lingering.
            </TypographyMuted>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex flex-wrap gap-2.5">
            {EXPIRATION_OPTIONS.map((opt) => {
              const isSelected = expirationDays === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  disabled={isSavingExpiration}
                  onClick={() => handleSelectExpiration(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <TypographyMuted className="text-[11px] text-muted-foreground mt-2.5 block">
            Note: You can always override or remove the expiration date for specific project links in their Share Dialog.
          </TypographyMuted>
        </div>
      </div>

      {/* 3. Active Sessions & Connected Devices */}
      <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted border border-border text-foreground">
              <Laptop className="size-4 text-primary" />
            </div>
            <div>
              <TypographyH3 className="font-heading text-base font-bold text-card-foreground">
                Active Sessions &amp; Connected Devices
              </TypographyH3>
              <TypographyMuted className="text-xs text-muted-foreground">
                Manage your active logins across different browsers and edit suites.
              </TypographyMuted>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSigningOutOthers}
            onClick={handleSignOutOtherSessions}
            className="rounded-xl text-xs font-semibold border-border text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
          >
            {isSigningOutOthers ? (
              <>
                <Loader2 className="size-3 mr-1.5 animate-spin" /> Signing out...
              </>
            ) : (
              <>
                <LogOut className="size-3 mr-1.5" /> Sign Out Other Devices
              </>
            )}
          </Button>
        </div>

        {/* Current Device Card */}
        <div className="p-4 rounded-xl bg-muted/60 border border-border flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {deviceInfo ? `${deviceInfo.browser} on ${deviceInfo.os}` : "Current Session"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                This Device
              </span>
            </div>
            {lastSignIn && (
              <TypographyMuted className="text-[11px] text-muted-foreground">
                Signed in at: {lastSignIn}
              </TypographyMuted>
            )}
          </div>
        </div>
      </div>

      {/* 2FA Enrollment Modal */}
      <Dialog open={isEnrolling} onOpenChange={(open) => !open && setIsEnrolling(false)}>
        <DialogContent size="md" className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Setup Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Scan the QR code with your authenticator app (Google Authenticator, Apple Passwords, 1Password, Authy), then enter the 6-digit code.
            </DialogDescription>
          </DialogHeader>

          {enrollData && (
            <div className="space-y-5 py-2">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-border w-fit mx-auto shadow-inner">
                {enrollData.totp.qr_code ? (
                  <img
                    src={enrollData.totp.qr_code}
                    alt="2FA QR Code"
                    className="size-48 object-contain"
                  />
                ) : (
                  <div className="size-48 flex items-center justify-center text-xs text-neutral-500">
                    Generating QR Code...
                  </div>
                )}
              </div>

              {/* Secret key for manual entry */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground block text-center">
                  Cannot scan? Enter this key manually:
                </label>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-1 bg-muted border border-border rounded-lg text-xs font-mono text-primary font-bold tracking-wider select-all">
                    {enrollData.totp.secret}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCopySecret}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy Secret"
                  >
                    {copiedSecret ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </div>

              {/* 6-Digit Code Input */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground block text-center">
                  Enter the 6-digit confirmation code:
                </label>
                <div className="max-w-[220px] mx-auto">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    className="w-full text-center text-lg tracking-[0.4em] font-mono bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {verifyError && (
                  <div className="text-center text-xs text-destructive flex items-center justify-center gap-1 mt-1">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEnrolling(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingCode || verifyCode.trim().length !== 6}
              onClick={handleVerify2FACode}
              className="rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              {isSubmittingCode ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <Check className="size-3.5 mr-1.5" /> Verify &amp; Activate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
