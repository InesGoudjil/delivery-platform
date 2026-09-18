"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  Copy,
  CheckCheck,
  Building2,
  ArrowUpRight,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  inviteWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction,
  removeWorkspaceMemberAction,
  revokeWorkspaceInvitationAction,
  acceptWorkspaceInvitationAction,
} from "@/app/actions/members";
import { WorkspaceRole, WorkspaceInvitation, EnrichedWorkspaceMember } from "@/core/entities/workspace-member";

interface MembersClientProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
    accountType: "individual" | "studio";
    ownerId: string;
  };
  currentUser: {
    id: string;
    email?: string | null;
  };
  canManage: boolean;
  isOwner: boolean;
  seatStats: {
    maxSeats: number;
    activeCount: number;
    pendingCount: number;
    usedSeats: number;
    remainingSeats: number;
    canInvite: boolean;
  };
  members: EnrichedWorkspaceMember[];
  pendingInvitations: WorkspaceInvitation[];
}

export function MembersClient({
  workspace,
  currentUser,
  canManage,
  isOwner,
  seatStats,
  members,
  pendingInvitations,
}: MembersClientProps) {
  const router = useRouter();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    const res = await inviteWorkspaceMemberAction(workspace.slug, inviteEmail.trim(), inviteRole);

    if (!res.success) {
      toast.error(res.error || "Failed to send invitation.");
      setIsSubmitting(false);
      return;
    }

    toast.success(`Invitation sent to ${inviteEmail.trim()}`);
    setInviteEmail("");
    setShowInviteModal(false);
    setIsSubmitting(false);
    router.refresh();
  };

  const handleRoleChange = async (memberUserId: string, newRole: WorkspaceRole) => {
    setLoadingActionId(`role_${memberUserId}`);
    const res = await updateWorkspaceMemberRoleAction(workspace.slug, memberUserId, newRole);

    if (!res.success) {
      toast.error(res.error || "Failed to update role.");
    } else {
      toast.success("Collaborator role updated successfully.");
      router.refresh();
    }
    setLoadingActionId(null);
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      return;
    }

    setLoadingActionId(`remove_${memberUserId}`);
    const res = await removeWorkspaceMemberAction(workspace.slug, memberUserId);

    if (!res.success) {
      toast.error(res.error || "Failed to remove member.");
    } else {
      toast.success(`Removed ${memberName} from workspace.`);
      router.refresh();
    }
    setLoadingActionId(null);
  };

  const handleRevokeInvite = async (invitationId: string, email: string) => {
    setLoadingActionId(`revoke_${invitationId}`);
    const res = await revokeWorkspaceInvitationAction(workspace.slug, invitationId);

    if (!res.success) {
      toast.error(res.error || "Failed to revoke invitation.");
    } else {
      toast.success(`Revoked invitation for ${email}.`);
      router.refresh();
    }
    setLoadingActionId(null);
  };

  const handleSimulateAccept = async (token: string, email: string) => {
    setLoadingActionId(`accept_${token}`);
    const res = await acceptWorkspaceInvitationAction(token);

    if (!res.success) {
      toast.error(res.error || "Failed to simulate invitation acceptance.");
    } else {
      toast.success(`Collaborator invitation accepted for ${email}!`);
      router.refresh();
    }
    setLoadingActionId(null);
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    toast.success("Invitation link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const isPersonalWorkspace = workspace.accountType === "individual" && seatStats.maxSeats <= 1;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider mb-1">
            <span>{workspace.brandName}</span>
            <span>•</span>
            <span>{isPersonalWorkspace ? "Personal Workspace" : "Studio Team Workspace"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
            Team Collaborators
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPersonalWorkspace
              ? "This is your personal solo workspace (1 seat). Switch to or create a Studio Workspace to invite team members."
              : "Invite assistant editors, colorists, and post producers to manage cuts and client deliveries."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seat Capacity Badge */}
          <div className="text-xs font-mono text-muted-foreground bg-muted px-3.5 py-2 rounded-full border border-border flex items-center gap-2">
            <Users className="size-3.5 text-primary" />
            <span>
              <strong className="text-foreground">{seatStats.usedSeats}</strong> of {seatStats.maxSeats} seats used
            </span>
          </div>

          {!isPersonalWorkspace && canManage && (
            <Button
              onClick={() => setShowInviteModal(true)}
              disabled={!seatStats.canInvite}
              className="rounded-full bg-primary text-black font-bold hover:bg-primary/90 shadow-md shadow-primary/20 text-xs cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="size-3.5 mr-1.5" />
              <span>Invite Collaborator</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notice for Personal Workspaces */}
      {isPersonalWorkspace && (
        <Card className="border border-border bg-gradient-to-r from-card via-card to-primary/5">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Sparkles className="size-4 text-primary" />
                <span>Collaborate with Team Members</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Personal workspaces are designed for individual creators.
                If you have a <strong>Studio Plan</strong>, you can create a dedicated <strong>Team Workspace</strong> with up to 5 seats to collaborate seamlessly alongside your personal workspace.
              </p>
            </div>

            <Button
              asChild
              size="sm"
              className="rounded-full bg-primary text-black font-bold hover:bg-primary/90 text-xs shrink-0 cursor-pointer"
            >
              <Link href="/new-workspace">
                <Building2 className="size-3.5 mr-1.5" />
                <span>Create Team Workspace</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-card-foreground">
                  Invite Team Collaborator
                </h3>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {seatStats.remainingSeats} seat{seatStats.remainingSeats > 1 ? "s" : ""} left
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Collaborators can upload cuts, reply to client notes, and manage deliveries.
              </p>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  placeholder="editor@posthouse.film"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Permission Role
                </label>
                <select
                  value={inviteRole}
                  disabled={isSubmitting}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                >
                  <option value="editor">Editor (Upload cuts &amp; reply to client comments)</option>
                  <option value="admin">Admin (Manage team seats &amp; workspace branding)</option>
                  <option value="viewer">Viewer (Read-only internal review)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-full text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !inviteEmail.trim()}
                  className="rounded-full text-xs font-bold bg-primary text-black hover:bg-primary/90 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Members Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Active Members ({members.length})
          </h2>
        </div>

        <div className="rounded-2xl bg-card border border-border divide-y divide-border shadow-sm overflow-hidden">
          {members.map((mem) => {
            const initials = mem.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "MB";

            const isCurrentCaller = mem.userId === currentUser.id;
            const isWorkspaceOwner = mem.isOwner || mem.role === "owner" || mem.userId === workspace.ownerId;
            const isActionLoading = loadingActionId === `role_${mem.userId}` || loadingActionId === `remove_${mem.userId}`;

            return (
              <div
                key={mem.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <Avatar size="sm" className="size-10 ring-1 ring-border">
                    {mem.avatarUrl && <AvatarImage src={mem.avatarUrl} alt={mem.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-card-foreground">
                        {mem.name}
                      </span>
                      {isCurrentCaller && (
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-muted text-muted-foreground border border-border">
                          You
                        </span>
                      )}
                      {isWorkspaceOwner && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-primary/15 text-primary border border-primary/30">
                          Workspace Owner
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Joined {new Date(mem.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Role Selector or Badge */}
                  {canManage && !isWorkspaceOwner ? (
                    <select
                      value={mem.role}
                      disabled={isActionLoading}
                      onChange={(e) => handleRoleChange(mem.userId, e.target.value as WorkspaceRole)}
                      className="bg-muted border border-border rounded-xl px-2.5 py-1 text-xs font-mono font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-muted text-muted-foreground capitalize border border-border">
                      {mem.role}
                    </span>
                  )}

                  {/* Remove Member Button */}
                  {canManage && !isWorkspaceOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isActionLoading}
                      onClick={() => handleRemoveMember(mem.userId, mem.name)}
                      className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                      title="Remove collaborator"
                    >
                      {loadingActionId === `remove_${mem.userId}` ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Pending Invitations ({pendingInvitations.length})
            </h2>
          </div>

          <div className="rounded-2xl bg-card border border-border divide-y divide-border shadow-sm overflow-hidden">
            {pendingInvitations.map((invite) => {
              const isActionLoading =
                loadingActionId === `revoke_${invite.id}` || loadingActionId === `accept_${invite.token}`;

              return (
                <div
                  key={invite.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                      <Mail className="size-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-card-foreground">
                          {invite.email}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="size-2.5" /> Invited
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-muted text-muted-foreground capitalize border border-border">
                      {invite.role}
                    </span>

                    {/* Copy Invite Link */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(invite.token)}
                      className="rounded-xl text-xs gap-1.5 cursor-pointer h-8 px-2.5"
                      title="Copy invitation link"
                    >
                      {copiedToken === invite.token ? (
                        <>
                          <CheckCheck className="size-3.5 text-primary" />
                          <span className="text-primary font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>

                    {/* Test/Demo Accept Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isActionLoading}
                      onClick={() => handleSimulateAccept(invite.token, invite.email)}
                      className="rounded-xl text-[11px] font-mono text-primary hover:bg-primary/10 cursor-pointer h-8 px-2"
                      title="Quickly simulate invite acceptance in test mode"
                    >
                      {loadingActionId === `accept_${invite.token}` ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Accept (Demo)"
                      )}
                    </Button>

                    {/* Revoke Invite */}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isActionLoading}
                        onClick={() => handleRevokeInvite(invite.id, invite.email)}
                        className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                        title="Revoke invitation"
                      >
                        {loadingActionId === `revoke_${invite.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
