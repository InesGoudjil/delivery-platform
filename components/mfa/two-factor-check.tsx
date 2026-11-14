"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/security/admin-mfa";

type Step =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "verify"; factorId: string }
  | { kind: "setup" }
  | { kind: "enroll"; factorId: string; qrCode: string; secret: string }
  | { kind: "error"; message: string };

/** Unique per attempt: Supabase refuses two factors with the same friendly name. */
function newFactorName(): string {
  return `Authenticator ${new Date().toISOString().slice(0, 10)} ${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Steps a signed-in session up to two-factor (aal2). Users with a verified authenticator enter a
 * code; users without one set it up here first. Platform admins are sent here before the admin panel.
 *
 * Loading the page only reads (React runs effects twice in development); enrolling, which creates
 * a factor, only happens when the user asks for it.
 */
export function TwoFactorCheck() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("redirect"), "/");
  const [supabase] = useState(() => createClient());

  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (!cancelled) setStep({ kind: "signed-out" });
        return;
      }

      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (level?.currentLevel === "aal2") {
        router.replace(returnTo);
        return;
      }

      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (error) {
        setStep({ kind: "error", message: error.message });
        return;
      }
      const verified = factors.totp.find((factor) => factor.status === "verified");
      setStep(verified ? { kind: "verify", factorId: verified.id } : { kind: "setup" });
    }

    load().catch((err: unknown) => {
      if (!cancelled) setStep({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, router, returnTo]);

  async function startEnrollment() {
    setBusy(true);
    try {
      // Unfinished set-ups count toward the factor limit; clear them before starting a new one.
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      for (const factor of factors.all.filter((candidate) => candidate.status === "unverified")) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }

      const { data: enrollment, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "CineSpace",
        friendlyName: newFactorName(),
      });
      if (error || !enrollment) throw error ?? new Error("Two-factor sign-in isn't available right now.");

      setCode("");
      setCodeError(null);
      setStep({ kind: "enroll", factorId: enrollment.id, qrCode: enrollment.totp.qr_code, secret: enrollment.totp.secret });
    } catch (err: unknown) {
      setStep({ kind: "error", message: err instanceof Error ? err.message : "Two-factor sign-in isn't available right now." });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step.kind !== "verify" && step.kind !== "enroll") return;
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setBusy(true);
    setCodeError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: step.factorId, code: code.trim() });
    if (error) {
      setBusy(false);
      setCodeError(error.message || "That code didn't work. Try the newest one.");
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }

  if (step.kind === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking your account…
      </div>
    );
  }

  if (step.kind === "signed-out") {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-bold">Sign in first</h1>
        <p className="text-sm text-muted-foreground">You need to be signed in to confirm it&apos;s you.</p>
        <Button render={<Link href="/login">Go to sign in</Link>} />
      </div>
    );
  }

  if (step.kind === "error") {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-bold">Two-factor check unavailable</h1>
        <p className="text-sm text-muted-foreground">{step.message}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  const heading = (title: string, body: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="size-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Two-factor check</span>
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );

  if (step.kind === "setup") {
    return (
      <div className="space-y-5">
        {heading(
          "Set up two-factor sign-in",
          "This page needs two-factor sign-in. You'll scan a QR code with an authenticator app (1Password, Google Authenticator, Authy…), then enter the 6-digit code it shows."
        )}
        <Button className="w-full" onClick={startEnrollment} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Set up an authenticator app
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {step.kind === "enroll"
        ? heading("Scan the code", "Scan this QR code with your authenticator app, then enter the 6-digit code it shows.")
        : heading("Enter your code", "Open your authenticator app and enter the 6-digit code for CineSpace.")}

      {step.kind === "enroll" && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          {/* Supabase returns the QR code as an SVG data URL. */}
          <img src={step.qrCode} alt="QR code for your authenticator app" className="mx-auto size-44 rounded-lg bg-white p-2" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Can&apos;t scan it? Enter this key instead:</p>
            <code className="block break-all rounded-md bg-background px-2 py-1.5 text-xs">{step.secret}</code>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="mfa-code" className="text-sm font-medium">
          6-digit code
        </label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          aria-invalid={codeError ? true : undefined}
          aria-describedby={codeError ? "mfa-code-error" : undefined}
        />
        {codeError && (
          <p id="mfa-code-error" className="text-sm text-destructive">
            {codeError}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {step.kind === "enroll" ? "Turn on two-factor and continue" : "Verify and continue"}
      </Button>
    </form>
  );
}
