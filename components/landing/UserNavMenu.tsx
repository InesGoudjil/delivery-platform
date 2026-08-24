"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Film,
  Globe,
  Settings,
  LogOut,
  Sparkles,
  ChevronDown,
} from "lucide-react";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/app/actions/auth";

export interface UserNavMenuProps {
  user: {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
      [key: string]: any;
    };
  };
  workspace?: {
    id: string;
    brandName: string;
    slug: string;
    logoUrl?: string | null;
    accentColor?: string | null;
  } | null;
}

export function UserNavMenu({ user, workspace }: UserNavMenuProps) {
  const [isPending, startTransition] = useTransition();

  const fullName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Creator";

  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "CR";

  const workspaceSlug = workspace?.slug || "dashboard";
  const workspaceDashboardUrl = `/${workspaceSlug}`;
  const projectsUrl = `/${workspaceSlug}/projects`;
  const portfolioUrl = `/${workspaceSlug}/portfolio`;
  const settingsUrl = `/${workspaceSlug}/settings`;

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger  className="flex items-center gap-2.5 rounded-full p-1 pl-1.5 pr-2.5 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-200 outline-none cursor-pointer group">
          <Avatar size="sm" className="size-8 ring-1 ring-white/20">
            {user.user_metadata?.avatar_url && (
              <AvatarImage
                src={user.user_metadata.avatar_url}
                alt={fullName}
              />
            )}
            <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
              {initials}
            </AvatarFallback>
            <AvatarBadge className="bg-[#86b98f] ring-2 ring-[#0a0a0b]" />
          </Avatar>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-[#f6f3ec] group-hover:text-white transition-colors leading-tight">
              {workspace?.brandName || fullName}
            </span>
            <span className="text-[10px] text-[#9a9a9f] font-mono leading-tight truncate max-w-[120px]">
              {user.email}
            </span>
          </div>

          <ChevronDown className="size-3.5 text-[#9a9a9f] group-hover:text-white transition-transform duration-200" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 bg-[#141416] border border-white/15 text-[#f6f3ec] p-2 rounded-2xl shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* User Identity Header */}
        <DropdownMenuLabel className="p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#f6f3ec] truncate">
              {fullName}
            </span>
            <Badge
              variant="orange"
              className="text-[10px] py-0 px-1.5 font-semibold font-mono uppercase"
            >
              PRO
            </Badge>
          </div>
          <p className="text-[11px] text-[#9a9a9f] truncate">{user.email}</p>
          {workspace && (
            <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-[#5e5e64]">Workspace:</span>
              <span className="font-semibold text-[#f5551d] font-mono">
                {workspace.brandName}
              </span>
            </div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10 my-1" />

        {/* Workspace Quick Links */}
        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuItem asChild>
            <Link
              href={workspaceDashboardUrl}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            >
              <LayoutDashboard className="size-4 text-[#f5551d]" />
              <span>Workspace Dashboard</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href={projectsUrl}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            >
              <Film className="size-4 text-[#86b98f]" />
              <span>My Projects & Cuts</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href={portfolioUrl}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            >
              <Globe className="size-4 text-[#ff8a45]" />
              <span>Public Video Portfolio</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href={settingsUrl}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#f6f3ec] hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            >
              <Settings className="size-4 text-[#9a9a9f]" />
              <span>Branding & Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-white/10 my-1" />

        {/* Sign Out Item */}
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isPending}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/15 hover:text-red-300 cursor-pointer transition-colors"
        >
          <LogOut className="size-4 text-red-400" />
          <span>{isPending ? "Signing out..." : "Sign Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
