"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, KeyRound, LogOut, MoreHorizontal, PanelRight, ShieldCheck, ShieldOff, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  banUserAction,
  resetUserTwoFactorAction,
  signOutUserEverywhereAction,
  unbanUserAction,
  updateUserRoleAction,
} from "@/app/actions/admin";
import { ReasonDialog } from "../../_components/reason-dialog";

export interface UserActionTarget {
  id: string;
  email: string | null;
  fullName: string | null;
  platformRole: "admin" | "user";
  bannedUntil: string | null;
  mfaEnabled: boolean;
}

type Dialog = "role" | "signout" | "ban" | "unban" | "mfa" | null;

const BAN_OPTIONS = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "indefinite", label: "Until lifted" },
] as const;

/** Row and page actions for a user. Each one asks for a reason and is audited. */
export function UserActionsMenu({
  user,
  isSelf,
  showOpen = true,
}: {
  user: UserActionTarget;
  isSelf: boolean;
  showOpen?: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [banDuration, setBanDuration] = useState<(typeof BAN_OPTIONS)[number]["value"]>("7d");
  const label = user.email ?? user.fullName ?? "this user";
  const isAdmin = user.platformRole === "admin";
  const banned = user.bannedUntil !== null && new Date(user.bannedUntil) > new Date();
  const open = (next: Dialog) => () => setDialog(next);
  const onOpenChange = (next: Dialog) => (isOpen: boolean) => setDialog(isOpen ? next : null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-60">
          {showOpen && (
            <DropdownMenuItem render={<Link href={`/admin/users/${user.id}`} />}>
              <PanelRight /> Open user page
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={open("role")} disabled={isSelf && isAdmin}>
            {isAdmin ? <ShieldOff /> : <ShieldCheck />}
            {isAdmin ? (isSelf ? "You can't remove your own admin role" : "Remove platform admin…") : "Make platform admin…"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={open("signout")} disabled={isSelf}>
            <LogOut /> Sign out everywhere…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={open("mfa")} disabled={isSelf || !user.mfaEnabled}>
            <KeyRound /> Reset two-factor…
          </DropdownMenuItem>
          {banned ? (
            <DropdownMenuItem onClick={open("unban")}>
              <Unlock /> Lift ban…
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={open("ban")} disabled={isSelf || isAdmin} variant="destructive">
              <Ban /> Ban…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReasonDialog
        open={dialog === "role"}
        onOpenChange={onOpenChange("role")}
        title={isAdmin ? `Remove ${label}'s platform admin role?` : `Make ${label} a platform admin?`}
        description={
          isAdmin
            ? "They'll lose access to the admin panel straight away."
            : "Platform admins can see every workspace and change plans, overrides, roles and accounts. They'll be asked to set up two-factor sign-in before they can open the admin panel."
        }
        confirmLabel={isAdmin ? "Remove admin" : "Make admin"}
        destructive={isAdmin}
        onConfirm={async (reason) => {
          const result = await updateUserRoleAction({ userId: user.id, role: isAdmin ? "user" : "admin", reason });
          if (!result.success) return result.error;
          toast.success(isAdmin ? `${label} is no longer a platform admin.` : `${label} is now a platform admin.`);
        }}
      />

      <ReasonDialog
        open={dialog === "signout"}
        onOpenChange={onOpenChange("signout")}
        title={`Sign ${label} out everywhere?`}
        description="Every device they're signed in on is signed out at once. They can sign in again with their password."
        confirmLabel="Sign out everywhere"
        destructive
        onConfirm={async (reason) => {
          const result = await signOutUserEverywhereAction({ userId: user.id, reason });
          if (!result.success) return result.error;
          toast.success(`Signed out of ${result.revokedDevices} ${result.revokedDevices === 1 ? "device" : "devices"}.`);
        }}
      />

      <ReasonDialog
        open={dialog === "mfa"}
        onOpenChange={onOpenChange("mfa")}
        title={`Reset ${label}'s two-factor sign-in?`}
        description="Removes their authenticator and signs them out everywhere. Their next sign-in is with their password only, and they can set up a new authenticator. Use it when they've lost their phone, after checking it's really them."
        confirmLabel="Reset two-factor"
        destructive
        onConfirm={async (reason) => {
          const result = await resetUserTwoFactorAction({ userId: user.id, reason });
          if (!result.success) return result.error;
          toast.success("Two-factor sign-in reset.");
        }}
      />

      <ReasonDialog
        open={dialog === "ban"}
        onOpenChange={onOpenChange("ban")}
        title={`Ban ${label}?`}
        description="They're signed out everywhere and can't sign in until the ban ends. Their workspaces and client links aren't touched."
        confirmLabel="Ban"
        destructive
        onConfirm={async (reason) => {
          const result = await banUserAction({ userId: user.id, duration: banDuration, reason });
          if (!result.success) return result.error;
          toast.success(`${label} is banned.`);
        }}
      >
        <div className="space-y-1.5">
          <span className="text-sm font-medium">For how long</span>
          <Select
            items={BAN_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            value={banDuration}
            onValueChange={(value) => setBanDuration((value as (typeof BAN_OPTIONS)[number]["value"]) ?? "7d")}
          >
            <SelectTrigger aria-label="Ban duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BAN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "unban"}
        onOpenChange={onOpenChange("unban")}
        title={`Lift the ban on ${label}?`}
        description="They can sign in again straight away."
        confirmLabel="Lift ban"
        onConfirm={async (reason) => {
          const result = await unbanUserAction({ userId: user.id, reason });
          if (!result.success) return result.error;
          toast.success("Ban lifted.");
        }}
      />
    </>
  );
}
