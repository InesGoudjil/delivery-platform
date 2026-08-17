"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Sparkles, ExternalLink } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { NavUser } from "@/components/workspaces/nav-user";
import { Button } from "@/components/ui/button";

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
  const brandName = workspace?.brandName || "Pedro Concreato";
  const workspaceSlug = workspace?.slug || "studio";
  const userEmail = user?.email || "pedro@cinespace.film";
  const userName = profile?.fullName || user?.user_metadata?.full_name || brandName;
  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url || workspace?.logoUrl;
  const planName = plan?.name || "Studio";

  const userData = {
    name: userName,
    email: userEmail,
    avatar: avatarUrl,
    planName,
    workspaceSlug,
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

        {/* User Dropdown with PC Badge */}
        <NavUser user={userData} />
      </div>
    </header>
  );
}
