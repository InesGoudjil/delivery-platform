"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Check, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { acceptWorkspaceInvitationAction } from "@/app/actions/members";

interface InviteClientProps {
  token: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  invitedEmail: string;
  status: string;
  isLoggedIn: boolean;
  currentUserEmail: string | null;
}

export function InviteClient({
  token,
  workspaceName,
  workspaceSlug,
  role,
  invitedEmail,
  status,
  isLoggedIn,
  currentUserEmail,
}: InviteClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
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

  if (status !== "pending") {
    return (
      <Card className="max-w-md w-full border border-border shadow-2xl animate-in fade-in duration-150">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
            <Users className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold font-heading">Invitation {status}</CardTitle>
          <CardDescription className="text-xs">
            This invitation has already been {status}.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center pt-2">
          <Button asChild className="rounded-full text-xs font-bold bg-primary text-black">
            <Link href={`/${workspaceSlug}`}>Go to Workspace</Link>
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
        <div className="text-xs font-mono text-primary uppercase tracking-wider font-semibold">
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

        <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1.5 font-mono">
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
        {isLoggedIn ? (
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
        ) : (
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
