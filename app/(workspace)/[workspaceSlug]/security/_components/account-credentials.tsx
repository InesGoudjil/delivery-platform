"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Check, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { TurnstileWidget, isCaptchaEnabled, type TurnstileHandle } from "@/components/security/turnstile-widget";
import { changePasswordAction } from "@/app/actions/auth";
import {
  changeEmailAction,
  getAccountCredentialsAction,
  setPasswordAction,
  type AccountCredentials as Credentials,
} from "@/app/actions/account";
import { PASSWORD_MIN_LENGTH } from "@/lib/validations/auth";

const INPUT_CLASS =
  "w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50";

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
      <AlertCircle className="size-4 shrink-0 mt-0.5" />
      <TypographySpan className="leading-snug">{message}</TypographySpan>
    </div>
  );
}

function SectionHeading({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-muted border border-border text-foreground">{icon}</div>
      <div>
        <TypographyH3 className="font-heading text-base font-bold text-card-foreground">{title}</TypographyH3>
        <TypographyMuted className="text-xs text-muted-foreground">{body}</TypographyMuted>
      </div>
    </div>
  );
}

/**
 * The Security page's sign-in details: the account's email address and its password. Accounts
 * made with Google have no password; they get "Set a password" (no current password to give).
 */
export function AccountCredentials() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  useEffect(() => {
    let mounted = true;
    getAccountCredentialsAction()
      .then((res) => {
        if (mounted && res.success) setCredentials(res.data);
      })
      .catch(() => {
        // Leaves the defaults: no email shown, "Change password".
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <EmailSection
        email={credentials?.email ?? null}
        pendingEmail={credentials?.pendingEmail ?? null}
        onRequested={(pendingEmail) => setCredentials((current) => (current ? { ...current, pendingEmail } : current))}
      />
      <PasswordSection
        hasPassword={credentials?.hasPassword ?? true}
        onPasswordSet={() => setCredentials((current) => (current ? { ...current, hasPassword: true } : current))}
      />
    </>
  );
}

function EmailSection({
  email,
  pendingEmail,
  onRequested,
}: {
  email: string | null;
  pendingEmail: string | null;
  onRequested: (pendingEmail: string) => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const requested = newEmail.trim();
    if (!requested) {
      setFormError("Enter the new email address.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await changeEmailAction(null, formData);
      if (res?.error) {
        setFormError(res.error);
      } else if (res?.success) {
        toast.success(res.success);
        setNewEmail("");
        onRequested(requested);
      }
    });
  };

  return (
    <div className="space-y-4 pb-6 border-b border-border">
      <SectionHeading
        icon={<Mail className="size-4 text-primary" />}
        title="Email Address"
        body={email ? `You sign in with ${email}.` : "The address you sign in with."}
      />

      {pendingEmail && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-foreground max-w-md">
          Waiting for confirmation of <span className="font-semibold">{pendingEmail}</span>. Open the links we sent to
          it and to your current address to finish the change.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md pt-2">
        <FormError message={formError} />
        <div className="space-y-1">
          <label htmlFor="new-email" className="text-xs font-semibold text-muted-foreground">
            New Email Address
          </label>
          <input
            id="new-email"
            type="email"
            name="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@studio.com"
            autoComplete="email"
            disabled={isPending}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 mr-1 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Mail className="size-3.5 mr-1" /> Send Confirmation Links
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PasswordSection({ hasPassword, onPasswordSet }: { hasPassword: boolean; onPasswordSet: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Checking the current password is a sign-in, so it needs the bot check when that's on.
  const captchaRef = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const waitingForCaptcha = hasPassword && isCaptchaEnabled() && !captchaToken;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if ((hasPassword && !currentPassword) || !newPassword) {
      setFormError("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setFormError(`Use at least ${PASSWORD_MIN_LENGTH} characters for the new password.`);
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = hasPassword ? await changePasswordAction(null, formData) : await setPasswordAction(null, formData);
      if (hasPassword) captchaRef.current?.reset();
      if (res?.error) {
        setFormError(res.error);
        toast.error(res.error);
      } else if (res?.success) {
        toast.success(res.success);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (!hasPassword) onPasswordSet();
      }
    });
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={<KeyRound className="size-4 text-primary" />}
        title={hasPassword ? "Change Account Password" : "Set a Password"}
        body={
          hasPassword
            ? "Ensure your account is using a long, random password."
            : "You sign in with Google. Add a password to sign in with your email address too."
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md pt-2">
        <FormError message={formError} />

        {hasPassword && (
          <div className="space-y-1">
            <label htmlFor="current-password" className="text-xs font-semibold text-muted-foreground">
              Current Password
            </label>
            <input
              id="current-password"
              type={showPassword ? "text" : "password"}
              name="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              disabled={isPending}
              className={INPUT_CLASS}
            />
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="new-password" className="text-xs font-semibold text-muted-foreground">
            New Password
          </label>
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            name="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            autoComplete="new-password"
            disabled={isPending}
            className={INPUT_CLASS}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="confirm-password" className="text-xs font-semibold text-muted-foreground">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            name="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
            disabled={isPending}
            className={INPUT_CLASS}
          />
        </div>

        {hasPassword && <TurnstileWidget ref={captchaRef} action="password-change" onToken={setCaptchaToken} />}

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
            disabled={isPending || waitingForCaptcha}
            className="rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 mr-1 animate-spin" /> Updating...
              </>
            ) : (
              <>
                <Check className="size-3.5 mr-1" /> {hasPassword ? "Update Password" : "Set Password"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
