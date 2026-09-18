"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { requestPasswordResetAction } from "@/app/actions/auth";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldError(null);

    const validationResult = forgotPasswordSchema.safeParse({ email });
    if (!validationResult.success) {
      setFieldError(validationResult.error.issues[0]?.message || "Please enter a valid email");
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await requestPasswordResetAction(null, formData);
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
          <div className="w-12 h-12 rounded-2xl bg-[#f5551d]/15 text-[#f5551d] flex items-center justify-center mb-2 shadow-inner">
            <Mail className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            Reset your password
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in-50">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in-50">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{success}</span>
          </div>
        )}

        {!success ? (
          <>
            <Field data-invalid={!!fieldError}>
              <FieldLabel htmlFor="email">Account Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="filmmaker@cinespace.film"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                disabled={isPending}
                aria-invalid={!!fieldError}
                autoComplete="email"
                autoFocus
              />
              {fieldError && (
                <FieldError errors={[{ message: fieldError }]} />
              )}
            </Field>

            <Field>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </Field>
          </>
        ) : (
          <Field>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Return to Login</Link>
            </Button>
          </Field>
        )}

        <FieldDescription className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
