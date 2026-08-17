"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "invited";
  avatar?: string;
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: "mem_1",
    name: "Pedro Concreato",
    email: "pedro@cinespace.film",
    role: "owner",
    status: "active",
  },
  {
    id: "mem_2",
    name: "Tariq Al-Mansoor",
    email: "tariq@cinespace.film",
    role: "editor",
    status: "active",
  },
  {
    id: "mem_3",
    name: "Sarah Jenkins",
    email: "sarah.j@cutpost.ae",
    role: "editor",
    status: "invited",
  },
];

export default function MembersPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "studio";

  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Member["role"]>("editor");
  const [toast, setToast] = useState<string | null>(null);

  const showFlash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: Member = {
      id: `mem_${Date.now()}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      status: "invited",
    };

    setMembers([...members, newMember]);
    setInviteEmail("");
    setShowInviteModal(false);
    showFlash(`Invitation sent to ${newMember.email}`);
  };

  const handleRemoveMember = (id: string, name: string) => {
    setMembers(members.filter((m) => m.id !== id));
    showFlash(`Removed ${name} from workspace`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Studio Workspace
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Team Collaborators
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite assistant editors, colorists, and post producers to manage cuts and client deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border">
            <span className="font-bold text-foreground">{members.length}</span> of 5 seats used
          </div>

          <Button
            onClick={() => setShowInviteModal(true)}
            className="rounded-full bg-[#f5551d] text-black font-bold hover:bg-[#ff8a45] shadow-md shadow-[#f5551d]/20 text-xs cursor-pointer"
          >
            <UserPlus className="size-3.5 mr-1.5" /> Invite Collaborator
          </Button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="font-heading text-lg font-bold text-card-foreground">
                Invite Team Member
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Collaborators can upload cuts, reply to client notes, and share delivery rooms.
              </p>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="editor@posthouse.film"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Permission Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Member["role"])}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="editor">Editor (Upload cuts &amp; respond to client feedback)</option>
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
                  className="rounded-full text-xs font-bold bg-primary text-black hover:bg-primary/90 cursor-pointer"
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border shadow-sm">
        {members.map((mem) => {
          const initials = mem.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const isOwner = mem.role === "owner";

          return (
            <div
              key={mem.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <Avatar size="sm" className="size-10 ring-1 ring-border">
                  <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-card-foreground">
                      {mem.name}
                    </span>
                    {mem.status === "invited" && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Clock className="size-2.5" /> Invited
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {mem.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-muted text-muted-foreground capitalize border border-border">
                  {mem.role}
                </span>

                {!isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(mem.id, mem.name)}
                    className="size-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer"
                    title="Remove collaborator"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
