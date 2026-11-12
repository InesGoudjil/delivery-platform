"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Check, ArrowRight, Loader2, AlertCircle, LogOut, MailWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { acceptWorkspaceInvitationAction } from "@/app/actions/members";
import { signOutAction } from "@/app/actions/auth";

/**
 * The visitor, as far as accepting goes: signed out, signed in with another email, signed in with
 * the invited email but not confirmed yet, or ready to accept.
 */
export type InviteViewerState = "signed_out" | "wrong_email" | "unconfirmed_email" | "ready";

interface InviteClientProps {
  token: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  invitedEmail: string;
  status: string;
  viewerState: InviteViewerState;
  currentUserEmail: string | null;
}

const UNAVAILABLE_COPY: Record<string, { title: string; description: string }> = {
  accepted: {
    title: "Invitation accepted",
    description: "This invitation has already been used.",
  },
  revoked: {
    title: "Invitation revoked",
    description: "This invitation was revoked. Ask the person who invited you to send a new one.",
  },
  expired: {
    title: "Invitation expired",
    description: "This invitation has expired. Ask the person who invited you to send a new one.",
  },
};

export function InviteClient({
  token,
  workspaceName,
  workspaceSlug,
  role,
  invitedEmail,
  status,
  viewerState,
  currentUserEmail,
}: InviteClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsAccepting(true);
    setErrorMsg(null);

    const res = await acceptWorkspaceInvitationAction(token);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to accept invitation.");
      setIsAccepting(false);
      return;
    }

    if (res.data?.workspaceSlug) {
      router.push(`/${res.data.workspaceSlug}`);
    } else {
      router.push(`/${workspaceSlug}`);
    }
  };

  const handleSignOut = () => {
    startSignOut(async () => {
      await signOutAction();
    });
  };

  if (status !== "pending") {
    const copy = UNAVAILABLE_COPY[status] ?? {
      title: `Invitation ${status}`,
      description: `This invitation has already been ${status}.`,
    };

    return (
      <Card className="max-w-md w-full border border-border shadow-2xl animate-in fade-in duration-150">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
            <Users className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold font-heading">{copy.title}</CardTitle>
          <CardDescription className="text-xs">{copy.description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center pt-2">
          <Button asChild className="rounded-full text-xs font-bold bg-primary text-black">
            {status === "accepted" ? (
              <Link href={`/${workspaceSlug}`}>Go to Workspace</Link>
            ) : (
              <Link href="/">Go to Home</Link>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150">
      <CardHeader className="text-center pb-3">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-inner">
          <Users className="size-7" />
        </div>
        <div className="text-xs  text-primary uppercase tracking-wider font-semibold">
          Collaborator Invitation
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold font-heading text-card-foreground mt-1">
          Join {workspaceName}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          You have been invited to join this studio workspace as an{" "}
          <strong className="text-foreground capitalize">{role}</strong>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {viewerState === "wrong_email" && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2">
            <MailWarning className="size-4 shrink-0 mt-0.5" />
            <span>
              This invitation was sent to <strong>{invitedEmail}</strong>, but you&apos;re signed in as{" "}
              <strong>{currentUserEmail || "an account without an email address"}</strong>. Sign out, then
              open this link again and sign in (or sign up) with {invitedEmail} to accept it.
            </span>
          </div>
        )}

        {viewerState === "unconfirmed_email" && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2">
            <MailWarning className="size-4 shrink-0 mt-0.5" />
            <span>
              Confirm your email address first: open the confirmation link we sent to{" "}
              <strong>{invitedEmail}</strong>, then come back to this page.
            </span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1.5 ">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Workspace:</span>
            <span className="font-bold text-foreground">{workspaceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assigned Role:</span>
            <span className="font-bold text-primary capitalize">{role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invited Email:</span>
            <span className="text-foreground truncate max-w-[200px]">{invitedEmail}</span>
          </div>
          {currentUserEmail && (
            <div className="flex justify-between pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Signed In As:</span>
              <span className="text-foreground font-semibold truncate max-w-[200px]">{currentUserEmail}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-2">
        {viewerState === "ready" && (
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full rounded-full text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer h-10"
          >
            {isAccepting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Joining Workspace...
              </>
            ) : (
              <>
                <Check className="size-4 mr-1.5" />
                Accept Invitation &amp; Join
              </>
            )}
          </Button>
        )}

        {viewerState === "wrong_email" && (
          <Button
            onClick={handleSignOut}
            disabled={isSigningOut}
            variant="outline"
            className="w-full rounded-full text-xs font-bold cursor-pointer h-10"
          >
            {isSigningOut ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="size-4 mr-1.5" />
            )}
            Sign Out
          </Button>
        )}

        {viewerState === "unconfirmed_email" && (
          <Button
            onClick={() => router.refresh()}
            variant="outline"
            className="w-full rounded-full text-xs font-bold cursor-pointer h-10"
          >
            <RefreshCw className="size-4 mr-1.5" />
            I&apos;ve Confirmed My Email
          </Button>
        )}

        {viewerState === "signed_out" && (
          <div className="w-full space-y-2">
            <Button
              asChild
              className="w-full rounded-full text-xs font-bold bg-primary text-black hover:bg-primary/90 cursor-pointer h-10"
            >
              <Link href={`/login?redirect=/invite/${token}`}>
                <span>Sign In to Accept</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
            <div className="text-center">
              <Link
                href={`/signup?redirect=/invite/${token}`}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Don&apos;t have an account? Sign up
              </Link>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
