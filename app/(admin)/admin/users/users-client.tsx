"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Shield,
  Search,
  MoreVertical,
  Mail,
  UserPlus,
  Building2,
  ExternalLink,
  Check,
  Clock,
  Sparkles,
  Zap,
  Lock,
  ArrowRight,
  Sliders,
  X,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { updateUserRoleAction, createCreatorAccountAction } from "@/app/actions/admin";

export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  platformRole: "admin" | "user";
  workspaceName?: string;
  workspaceSlug?: string;
  planName?: string;
  storageUsedGB?: number;
  projectsCount?: number;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  createdAt: string;
}

export interface UsersClientProps {
  users: AdminUserListItem[];
}

export function UsersClient({ users }: UsersClientProps) {
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [userList, setUserList] = useState<AdminUserListItem[]>(users);

  // Selected User for Modals
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [roleSuccess, setRoleSuccess] = useState(false);

  // Invite Creator Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.workspaceName && u.workspaceName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === "all" || u.platformRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalAdmins = userList.filter((u) => u.platformRole === "admin").length;
  const totalCreators = userList.filter((u) => u.platformRole === "user").length;

  const handleOpenRoleModal = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setNewRole(user.platformRole);
    setRoleSuccess(false);
    setRoleModalOpen(true);
  };

  const handleOpenInspect = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setInspectModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    startTransition(async () => {
      const res = await updateUserRoleAction(selectedUser.id, newRole);
      if (res.success) {
        setUserList((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, platformRole: newRole } : u
          )
        );
        setRoleSuccess(true);
        setTimeout(() => {
          setRoleModalOpen(false);
          setRoleSuccess(false);
        }, 1000);
      }
    });
  };

  const handleInviteCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    const formData = new FormData();
    formData.set("fullName", inviteName.trim());
    formData.set("email", inviteEmail.trim());
    formData.set("role", inviteRole);

    startTransition(async () => {
      const res = await createCreatorAccountAction(formData);
      if (res.success) {
        setInviteSuccess(true);
        const newUser: AdminUserListItem = {
          id: `usr_${Date.now()}`,
          fullName: inviteName.trim(),
          email: inviteEmail.trim(),
          platformRole: inviteRole,
          workspaceName: `${inviteName.trim()} Studio`,
          workspaceSlug: inviteName.trim().toLowerCase().replace(/\s+/g, "-"),
          planName: "Pro",
          storageUsedGB: 0,
          projectsCount: 0,
          createdAt: new Date().toISOString(),
        };
        setUserList([newUser, ...userList]);

        setTimeout(() => {
          setInviteModalOpen(false);
          setInviteSuccess(false);
          setInviteName("");
          setInviteEmail("");
        }, 1000);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ======================= TOP HEADER ======================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-xs font-mono text-[#f5551d] uppercase tracking-wider mb-1">
            Platform Users &amp; Roles
          </div>
          <h1 className="text-3xl font-black font-heading text-foreground tracking-tight">
            Creator Directory &amp; Permissions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage creator profiles, grant super admin privileges, and inspect workspace ownership.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setInviteModalOpen(true)}
            className="rounded-full bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] shadow-lg shadow-[#f5551d]/20 cursor-pointer"
          >
            <UserPlus className="size-3.5 mr-1.5" /> Provision Creator
          </Button>
        </div>
      </div>

      {/* ======================= STAT METRICS ROW ======================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-mono uppercase">
                Total Registered Creators
              </CardDescription>
              <Users className="size-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black font-heading text-foreground">
              {userList.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-mono">
              {totalCreators} standard filmmakers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-mono uppercase">
                Platform Super Admins
              </CardDescription>
              <Shield className="size-4 text-[#f5551d]" />
            </div>
            <CardTitle className="text-2xl font-black font-heading text-foreground">
              {totalAdmins}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#f5551d] font-mono font-medium">
              Full control over subscriptions &amp; quotas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-mono uppercase">
                Active Studio Workspaces
              </CardDescription>
              <Building2 className="size-4 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-black font-heading text-foreground">
              {userList.filter((u) => u.workspaceSlug).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-400 font-mono font-medium">
              100% Onboarding Completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ======================= USERS TABLE CARD ======================= */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold font-heading">
                All Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Search and manage platform roles across all registered accounts.
              </CardDescription>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search name, email, or studio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs rounded-xl bg-muted border-border"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
                {(["all", "admin", "user"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      roleFilter === r
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "all" ? "All Users" : r === "admin" ? "Admins" : "Creators"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Creator &amp; Email</th>
                  <th className="p-4">Studio Workspace</th>
                  <th className="p-4">Plan Tier</th>
                  <th className="p-4">Platform Role</th>
                  <th className="p-4">Last Login</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors group">
                    {/* Avatar & Name */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 rounded-xl border border-border">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs rounded-xl">
                            {u.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {u.fullName}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Studio Workspace */}
                    <td className="p-4">
                      {u.workspaceSlug ? (
                        <Link
                          href={`/${u.workspaceSlug}/deliveries`}
                          target="_blank"
                          className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <span>{u.workspaceName || u.workspaceSlug}</span>
                          <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </td>

                    {/* Plan Tier */}
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono capitalize border-border"
                      >
                        {u.planName || "Pro"}
                      </Badge>
                    </td>

                    {/* Platform Role */}
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono capitalize ${
                          u.platformRole === "admin"
                            ? "bg-[#f5551d]/15 text-[#f5551d] border-[#f5551d]/30 font-bold"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {u.platformRole === "admin" ? "Super Admin" : "Creator"}
                      </Badge>
                    </td>

                    {/* Last Login */}
                    <td className="p-4 text-[11px] text-muted-foreground font-mono">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Active recently"}
                    </td>

                    {/* Action Dropdown */}
                    <td className="p-4 pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                          <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground">
                            User Operations
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleOpenRoleModal(u)}
                            className="cursor-pointer text-xs gap-2"
                          >
                            <Shield className="size-3.5 text-[#f5551d]" /> Change Platform Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenInspect(u)}
                            className="cursor-pointer text-xs gap-2"
                          >
                            <Sliders className="size-3.5 text-primary" /> Inspect Account Details
                          </DropdownMenuItem>
                          {u.workspaceSlug && (
                            <DropdownMenuItem asChild className="cursor-pointer text-xs gap-2">
                              <Link href={`/${u.workspaceSlug}/deliveries`} target="_blank">
                                <ExternalLink className="size-3.5 text-muted-foreground" /> Open Workspace
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild className="cursor-pointer text-xs gap-2">
                            <a href={`mailto:${u.email}`}>
                              <Mail className="size-3.5 text-muted-foreground" /> Send Direct Email
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ======================= CHANGE ROLE DIALOG ======================= */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="size-5 text-[#f5551d]" />
              Update Platform Role
            </DialogTitle>
            <DialogDescription>
              Assign system permissions for{" "}
              <strong className="text-foreground font-semibold">
                {selectedUser?.fullName} ({selectedUser?.email})
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRole} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Select Platform Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewRole("user")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    newRole === "user"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <p className="font-bold text-xs">Standard Creator</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Owns studio workspaces &amp; projects.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setNewRole("admin")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    newRole === "admin"
                      ? "border-[#f5551d] bg-[#f5551d]/10 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <p className="font-bold text-xs text-[#f5551d]">Super Admin</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Full access to /admin console &amp; billing.
                  </p>
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || roleSuccess}
                className="rounded-full bg-primary text-black font-bold text-xs hover:bg-primary/90"
              >
                {roleSuccess ? (
                  <>
                    <Check className="size-3.5 mr-1" /> Role Updated!
                  </>
                ) : isPending ? (
                  "Updating..."
                ) : (
                  "Save Role Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================= PROVISION CREATOR DIALOG ======================= */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Provision New Creator Account
            </DialogTitle>
            <DialogDescription>
              Create a new filmmaker account with instant workspace setup.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteCreator} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Full Name
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Maya Lin"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="bg-muted border-border text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                required
                placeholder="maya@mayafilms.ae"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-muted border-border text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || inviteSuccess}
                className="rounded-full bg-primary text-black font-bold text-xs hover:bg-primary/90"
              >
                {inviteSuccess ? (
                  <>
                    <Check className="size-3.5 mr-1" /> Provisioned!
                  </>
                ) : isPending ? (
                  "Creating..."
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================= USER INSPECT DIALOG ======================= */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="size-5 text-primary" />
              Creator Account Inspection
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                <Avatar className="size-10 rounded-xl border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {selectedUser.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground text-sm">{selectedUser.fullName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-muted-foreground font-mono">
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-[10px] uppercase text-muted-foreground">User ID</p>
                  <p className="font-bold text-foreground text-xs truncate mt-0.5">{selectedUser.id}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-[10px] uppercase text-muted-foreground">Role</p>
                  <p className="font-bold text-foreground text-xs capitalize mt-0.5">{selectedUser.platformRole}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-[10px] uppercase text-muted-foreground">Studio Workspace</p>
                  <p className="font-bold text-foreground text-xs mt-0.5">{selectedUser.workspaceName || "—"}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-[10px] uppercase text-muted-foreground">Plan Tier</p>
                  <p className="font-bold text-primary text-xs mt-0.5">{selectedUser.planName || "Pro"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
