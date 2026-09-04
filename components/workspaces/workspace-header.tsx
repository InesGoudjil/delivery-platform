"use client";

import * as React from "react";
import Link from "next/link";
import {
  Play,
  Pencil,
  Palette,
  Star,
  Download,
  Lock,
  Bell,
  HardDrive,
  MessageCircle,
  ArrowRight,
  ExternalLink,
  Users,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarBadge,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/actions/auth";

import { WorkspaceHeaderSwitcher, WorkspaceHeaderItem } from "./workspace-header-switcher";

export interface WorkspaceHeaderProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
    logoUrl?: string | null;
  };
  workspaces?: Array<{
    id: string;
    brandName: string;
    slug: string;
    accountType?: string;
  }>;
  user: {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
      [key: string]: any;
    };
  };
  profile?: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
  plan?: {
    id: string;
    name: string;
  } | null;
}

export function WorkspaceHeader({
  workspace,
  workspaces = [],
  user,
  profile,
  plan,
}: WorkspaceHeaderProps) {
  const [isPending, startTransition] = React.useTransition();

  const brandName = workspace?.brandName || "Pedro Concreato";
  const workspaceSlug = workspace?.slug || "studio";
  const userEmail = user?.email || "pedro@cinespace.film";
  const userName = profile?.fullName || user?.user_metadata?.full_name || brandName;
  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url || workspace?.logoUrl;
  const planName = plan?.name || "Studio";

  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PC";

  const handleLogout = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  const listToMap = workspaces.length > 0 ? workspaces : workspace ? [workspace] : [];
  const headerWorkspaceItems: WorkspaceHeaderItem[] = listToMap.map((w) => ({
    id: w.id,
    name: w.brandName,
    slug: w.slug,
    plan: planName ? `${planName} plan` : "Studio plan",
  }));

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-6 sticky top-0 z-40 text-foreground transition-colors duration-200">
      {/* Left: Trigger + Logo + Workspace Switcher Pill */}
      <div className="flex items-center gap-3.5">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />

        <Link href={`/${workspaceSlug}`} className="flex items-center gap-2.5">
          <div className="text-lg font-bold tracking-tight">
            <span className="text-primary">Cine</span>
            <span className="text-foreground">Space</span>
          </div>
        </Link>

        <span className="text-muted-foreground/30 font-mono text-sm hidden sm:inline">/</span>

        {/* Top Header Workspace Switcher Dropdown */}
        <WorkspaceHeaderSwitcher
          workspaces={headerWorkspaceItems}
          activeSlug={workspaceSlug}
        />
      </div>

      {/* Right: Live Preview + Language + Theme + User Menu */}
      <div className="flex items-center gap-3">
        {/* LIVE PREVIEW Glowing Button */}
        <Button
          asChild
          className="rounded-full bg-gradient-to-r from-[#d9481d] to-[#802010] hover:from-[#f5551d] hover:to-[#992e10] text-white font-bold text-xs tracking-wider uppercase px-4 py-1.5 shadow-lg shadow-[#d9481d]/30 border border-[#f5551d]/40 transition-all duration-200 hover:scale-[1.02] cursor-pointer h-8 gap-1.5"
        >
          <Link href={`/p/${workspaceSlug}`} target="_blank" rel="noreferrer">
            <Play className="size-3 fill-white" />
            <span>LIVE PREVIEW</span>
          </Link>
        </Button>

        <LanguageToggle />
        <ModeToggle />

        {/* User Avatar Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center rounded-full p-0.5 outline-none cursor-pointer group">
            <Avatar size="sm" className="size-8 ring-2 ring-border group-hover:ring-primary/60 transition-all">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                {initials}
              </AvatarFallback>
              <AvatarBadge className="bg-[#86b98f] ring-2 ring-background" />
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-2xl bg-popover border border-border text-popover-foreground p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
            side="bottom"
            align="end"
            sideOffset={8}
          >
            {/* Identity Header */}
            <DropdownMenuLabel className="p-2.5 space-y-1 font-normal">
              <div className="flex items-center gap-3">
                <Avatar size="sm" className="size-9 ring-1 ring-border shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 truncate leading-tight">
                  <span className="font-bold text-sm text-foreground truncate">
                    {userName}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono truncate">
                    {userEmail}
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/15 text-primary border border-primary/30">
                      {planName} plan
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-border my-1" />

            {/* Core Account & Branding Settings */}
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/settings`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Pencil className="size-4 text-primary" />
                  <span>Profile &amp; Bio</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/settings#branding`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Palette className="size-4 text-amber-500" />
                  <span>Brand &amp; Logo</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/members`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Users className="size-4 text-sky-500" />
                  <span>Team Collaborators</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border my-1" />

            {/* Subscription, Billing, Security & Notifications */}
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/subscription`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Star className="size-4 text-amber-400" />
                  <span>Subscription &amp; Billing</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/security`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Lock className="size-4 text-blue-500" />
                  <span>Security &amp; Passcodes</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/notifications`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <Bell className="size-4 text-purple-400" />
                  <span>WhatsApp &amp; Alerts</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/storage`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <HardDrive className="size-4 text-slate-400" />
                  <span>Storage &amp; Usage</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border my-1" />

            {/* Public Link */}
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem asChild>
                <Link
                  href={`/p/${workspaceSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ExternalLink className="size-4 text-primary" />
                    <span>View Public Portfolio</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Live</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border my-1" />

            {/* Logout Action */}
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isPending}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
            >
              <ArrowRight className="size-4 text-destructive" />
              <span>{isPending ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
