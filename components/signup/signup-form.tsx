"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signupSchema } from "@/lib/validations/auth";
import { signupAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [waitlistToken, setWaitlistToken] = useState<string | null>(null);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        if (errorParam === "auth-callback-failed") {
          setError("Social sign up could not be completed. Please try again.");
        } else if (errorParam === "access_denied") {
          setError("Google sign-in was cancelled or access was denied.");
        } else {
          setError(decodeURIComponent(errorParam));
        }
      }
      const initialEmail = params.get("email");
      if (initialEmail) {
        setEmail(initialEmail);
      }
      const token = params.get("waitlist_token");
      if (token) {
        setWaitlistToken(token);
      }
    }
  }, []);

  const handleOAuthSignup = async (provider: "google" | "apple") => {
    try {
      setError(null);
      setSuccess(null);
      setOauthLoadingProvider(provider);
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const next = params.get("redirect") || params.get("next") || "/";
      const callbackUrl = new URL(`${window.location.origin}/api/auth/callback`);
      callbackUrl.searchParams.set("next", next);
      if (params.get("invite_token")) {
        callbackUrl.searchParams.set("invite_token", params.get("invite_token")!);
      }
      const token = params.get("waitlist_token") || waitlistToken;
      if (token) {
        callbackUrl.searchParams.set("waitlist_token", token);
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setOauthLoadingProvider(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OAuth sign up failed");
      setOauthLoadingProvider(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const validationResult = signupSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      const errors: {
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
      } = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as
          | "name"
          | "email"
          | "password"
          | "confirmPassword";
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signupAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccess(res.success);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      noValidate
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Start delivering films like a studio with CineSpace
          </p>
        </div>

        {waitlistToken && (
          <>
            <input type="hidden" name="waitlist_token" value={waitlistToken} />
            <div className="flex items-center justify-center gap-2 rounded-lg border border-[#f5551d]/30 bg-[#f5551d]/10 px-3 py-2 text-xs font-semibold text-[#f5551d] animate-in fade-in-50">
              <CheckCircle2 className="size-4" />
              <span>Waitlist VIP Invitation Verified</span>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in-50">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in-50">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{success}</span>
          </div>
        )}

        <Field data-invalid={!!fieldErrors.name}>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Stanley Kubrick"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            disabled={isPending}
            aria-invalid={!!fieldErrors.name}
            autoComplete="name"
          />
          {fieldErrors.name && (
            <FieldError errors={[{ message: fieldErrors.name }]} />
          )}
        </Field>

        <Field data-invalid={!!fieldErrors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="creator@cinespace.film"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            disabled={isPending}
            aria-invalid={!!fieldErrors.email}
            autoComplete="email"
          />
          {fieldErrors.email && (
            <FieldError errors={[{ message: fieldErrors.email }]} />
          )}
          <FieldDescription>
            We&apos;ll use this to notify you about deliveries and client approvals.
          </FieldDescription>
        </Field>

        <Field data-invalid={!!fieldErrors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={isPending}
              aria-invalid={!!fieldErrors.password}
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <FieldError errors={[{ message: fieldErrors.password }]} />
          )}
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
        </Field>

        <Field data-invalid={!!fieldErrors.confirmPassword}>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              name="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }
              }}
              disabled={isPending}
              aria-invalid={!!fieldErrors.confirmPassword}
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <FieldError errors={[{ message: fieldErrors.confirmPassword }]} />
          )}
        </Field>

        <Field>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </Field>

        <FieldSeparator>Or continue with</FieldSeparator>

        <div 
        // className="grid grid-cols-2 gap-3"
        >
          <Button
            variant="outline"
            type="button"
            disabled={isPending || oauthLoadingProvider !== null}
            onClick={() => handleOAuthSignup("google")}
            className="w-full gap-2 font-medium"
          >
            {oauthLoadingProvider === "google" ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg
                  viewBox="-3 0 262 262"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid"
                  className="size-4 shrink-0"
                >
                  <path
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                    fill="#4285F4"
                  />
                  <path
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                    fill="#34A853"
                  />
                  <path
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                    fill="#FBBC05"
                  />
                  <path
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                    fill="#EB4335"
                  />
                </svg>
                Google
              </>
            )}
          </Button>

          {/* <Button
            variant="outline"
            type="button"
            disabled={isPending || oauthLoadingProvider !== null}
            onClick={() => handleOAuthSignup("apple")}
            className="w-full gap-2 font-medium"
          >
            {oauthLoadingProvider === "apple" ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4 shrink-0"
                >
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                </svg>
                Apple
              </>
            )}
          </Button> */}
        </div>

        <FieldDescription className="text-center pt-2">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Sign in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
