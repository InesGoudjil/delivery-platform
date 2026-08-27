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

export interface WorkspaceHeaderProps {
  workspace: {
    id: string;
    brandName: string;
    slug: string;
    logoUrl?: string | null;
  };
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

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#0c0c0e]/90 backdrop-blur-xl px-6 sticky top-0 z-40">
      {/* Left: Trigger + Logo + Dashboard title */}
      <div className="flex items-center gap-3.5">
        <SidebarTrigger className="text-[#8e8e93] hover:text-white transition-colors cursor-pointer" />

        <Link href={`/${workspaceSlug}`} className="flex items-center gap-2.5">
          <div className="text-lg font-bold tracking-tight">
            <span className="text-[#f5551d]">Cine</span>
            <span className="text-[#f6f3ec]">Space</span>
          </div>
          <span className="text-xs text-[#71717a] font-medium pl-2.5 border-l border-white/10 hidden sm:inline">
            Dashboard
          </span>
        </Link>
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
            <Avatar size="sm" className="size-8 ring-2 ring-white/10 group-hover:ring-[#f5551d]/60 transition-all">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                {initials}
              </AvatarFallback>
              <AvatarBadge className="bg-[#86b98f] ring-2 ring-[#0c0c0e]" />
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-2xl bg-[#141416] border border-white/15 text-[#f6f3ec] p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
            side="bottom"
            align="end"
            sideOffset={8}
          >
            {/* Identity Header */}
            <DropdownMenuLabel className="p-2.5 space-y-1 font-normal">
              <div className="flex items-center gap-3">
                <Avatar size="sm" className="size-9 ring-1 ring-white/20 shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 truncate leading-tight">
                  <span className="font-bold text-sm text-[#f6f3ec] truncate">
                    {userName}
                  </span>
                  <span className="text-xs text-[#9a9a9f] font-mono truncate">
                    {userEmail}
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30">
                      {planName} plan
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Core Account & Branding Settings */}
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/settings`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <Pencil className="size-4 text-[#f5551d]" />
                  <span>Profile &amp; Bio</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/settings#branding`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <Palette className="size-4 text-[#fb923c]" />
                  <span>Brand &amp; Logo</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/members`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <Users className="size-4 text-[#38bdf8]" />
                  <span>Team Collaborators</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Subscription, Billing, Security & Notifications */}
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/subscription`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <Star className="size-4 text-[#fbbf24]" />
                  <span>Subscription</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/billing`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <Download className="size-4 text-[#86b98f]" />
                  <span>Billing &amp; Invoices</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/security`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <Lock className="size-4 text-[#60a5fa]" />
                  <span>Security &amp; Passcodes</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/notifications`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <Bell className="size-4 text-[#c084fc]" />
                  <span>WhatsApp &amp; Alerts</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/storage`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <HardDrive className="size-4 text-[#94a3b8]" />
                  <span>Storage &amp; Usage</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Support & Public Link */}
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem asChild>
                <Link
                  href={`/${workspaceSlug}/help`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <MessageCircle className="size-4 text-[#a78bfa]" />
                  <span>Help &amp; Support</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href={`/p/${workspaceSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-[#9a9a9f] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ExternalLink className="size-4 text-[#f5551d]" />
                    <span>View Public Portfolio</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717a]">Live</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Logout Action */}
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isPending}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/15 hover:text-red-300 cursor-pointer transition-colors"
            >
              <ArrowRight className="size-4 text-red-400" />
              <span>{isPending ? "Logging out..." : "Log out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
