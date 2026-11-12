import { getServerServices, getServerAdminServices } from "@/core/server";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { getInvitationAcceptBlocker, isInvitationExpired } from "@/core/services/member.service";
import { InviteClient, type InviteViewerState } from "./invite-client";
import { WaitlistInviteClaim } from "@/components/waitlist/WaitlistInviteClaim";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const services = await getServerServices();
  const user = await services.auth.getCurrentUser();

  // The token is the capability to view its invitation. The invitee isn't a member yet (and may be
  // signed out), so RLS would hide the invitation and its workspace: read both with the service role.
  const adminServices = await getServerAdminServices();
  const invite = await adminServices.member.getInvitationByToken(token);

  // If not a workspace member invitation, check if this is a SaaS waitlist invite
  if (!invite) {
    const waitlistEntry = await services.waitlist.verifyInviteToken(token);
    if (waitlistEntry) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#070709] text-white">
          <WaitlistInviteClaim token={token} email={waitlistEntry.email} />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
        <Card className="max-w-md w-full border border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2">
              <AlertTriangle className="size-6" />
            </div>
            <CardTitle className="text-xl font-bold font-heading">Invalid Invitation</CardTitle>
            <CardDescription className="text-xs">
              This invitation link is invalid or has expired. Please request a new invitation from the workspace owner.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-2">
            <Button asChild className="rounded-full text-xs font-bold bg-primary text-black">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const workspace = await adminServices.workspace.getWorkspaceById(invite.workspaceId);
  const status = invite.status === "pending" && isInvitationExpired(invite) ? "expired" : invite.status;

  // Same check as acceptInvitation(): the signed-in account's email must be the invited one, confirmed.
  const viewerState: InviteViewerState = !user
    ? "signed_out"
    : getInvitationAcceptBlocker(invite.email, {
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at,
      }) ?? "ready";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <InviteClient
        token={token}
        workspaceName={workspace?.brandName || "Studio Workspace"}
        workspaceSlug={workspace?.slug || "studio"}
        role={invite.role}
        invitedEmail={invite.email}
        status={status}
        viewerState={viewerState}
        currentUserEmail={user?.email || null}
      />
    </div>
  );
}
