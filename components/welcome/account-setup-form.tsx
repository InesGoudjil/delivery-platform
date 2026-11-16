"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

import { completeAccountSetupAction, type AccountSetupState } from "@/app/actions/account-setup";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPasswordSchema } from "@/lib/validations/auth";

type FieldErrors = { password?: string; confirmPassword?: string };

/**
 * The /welcome page's form: someone the team made an account for chooses their password, and is
 * then signed in and sent to their workspace.
 */
export function AccountSetupForm({
  token,
  email,
  firstName,
  studioName,
  signedInAs,
}: {
  token: string;
  email: string;
  firstName: string | null;
  studioName: string | null;
  /** Someone else signed in on this browser: continuing signs them out. */
  signedInAs: string | null;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<AccountSetupState | null>(null);
  const [isPending, startTransition] = useTransition();

  if (state?.linkUnusable) return <SetupLinkUnusable message={state.error} />;

  if (state?.passwordSet) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Your password is saved</h1>
        <p className="text-sm text-balance text-muted-foreground">{state.error}</p>
        <Button className="w-full" render={<Link href="/login">Go to sign in</Link>} />
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState(null);
    setFieldErrors({});

    const checked = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!checked.success) {
      const errors: FieldErrors = {};
      for (const issue of checked.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await completeAccountSetupAction(null, formData);
      // Success redirects; anything returned is a problem to show.
      if (result) setState(result);
    });
  };

  const clearError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="token" value={token} />
      {/* For password managers: the account the new password belongs to. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />

      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
            <Sparkles className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {firstName ? `Welcome, ${firstName}` : "Welcome to CineSpace"}
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            {studioName ? `Your account for ${studioName} is ready.` : "Your account is ready."} Choose a password
            to sign in as <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        {signedInAs && (
          <p className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            You&apos;re signed in as {signedInAs} on this browser. Continuing signs you out of that account.
          </p>
        )}

        {state?.error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="leading-snug">{state.error}</span>
          </div>
        )}

        <Field data-invalid={!!fieldErrors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError("password");
              }}
              disabled={isPending}
              aria-invalid={!!fieldErrors.password}
              className="pr-10"
              autoComplete="new-password"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          {fieldErrors.password && <FieldError errors={[{ message: fieldErrors.password }]} />}
        </Field>

        <Field data-invalid={!!fieldErrors.confirmPassword}>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <Input
            id="confirm-password"
            name="confirm-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearError("confirmPassword");
            }}
            disabled={isPending}
            aria-invalid={!!fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
          {fieldErrors.confirmPassword && <FieldError errors={[{ message: fieldErrors.confirmPassword }]} />}
        </Field>

        <Field>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Setting up your account…
              </>
            ) : (
              "Save password and open my studio"
            )}
          </Button>
        </Field>

        <FieldDescription className="text-center">
          Prefer Google? Close this page and choose &ldquo;Continue with Google&rdquo; on the{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            sign-in page
          </Link>{" "}
          with this address.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}

/** Shown for an expired, used or unknown link: the ways back in. */
export function SetupLinkUnusable({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <AlertCircle className="size-6" />
      </div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">This link can&apos;t be used</h1>
      <p className="text-sm text-balance text-muted-foreground">
        {message ??
          "It has expired or was already used. Sign in, or use \"Forgot password\" on the sign-in page."}{" "}
        You can also reply to your welcome email and we&apos;ll send a new one.
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button className="w-full" render={<Link href="/login">Sign in</Link>} />
        <Button variant="outline" className="w-full" render={<Link href="/forgot-password">Forgot password</Link>} />
      </div>
    </div>
  );
}
