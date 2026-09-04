"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus, Check, Building2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface WorkspaceHeaderItem {
  id?: string;
  name: string;
  slug?: string;
  plan?: string;
  accentColor?: string | null;
}

export interface WorkspaceHeaderSwitcherProps {
  workspaces?: WorkspaceHeaderItem[];
  activeSlug?: string;
}

export function WorkspaceHeaderSwitcher({
  workspaces = [],
  activeSlug,
}: WorkspaceHeaderSwitcherProps) {
  const router = useRouter();

  const activeWorkspace =
    workspaces.find((w) => w.slug === activeSlug) ||
    workspaces[0] || {
      name: "My Studio",
      slug: "studio",
      plan: "Studio",
    };

  const initials = (activeWorkspace.name || "WS")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSelect = (ws: WorkspaceHeaderItem) => {
    if (ws.slug && ws.slug !== activeSlug) {
      router.push(`/${ws.slug}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 rounded-full px-2.5 bg-muted/60 hover:bg-muted text-foreground border border-border transition-all cursor-pointer font-sans"
        >
          <div className="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-[9px] shrink-0">
            {initials}
          </div>
          <span className="truncate text-xs font-bold max-w-[130px]">
            {activeWorkspace.name}
          </span>
          <ChevronsUpDown className="size-3 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-60 rounded-2xl bg-popover border border-border text-popover-foreground p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
        align="start"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-[10px] font-mono text-muted-foreground px-2.5 py-1 uppercase tracking-wider">
          Workspaces ({workspaces.length})
        </DropdownMenuLabel>

        <div className="flex flex-col gap-1 my-1">
          {workspaces.map((ws, idx) => {
            const isCurrent = ws.slug === activeSlug;
            const wsInitials = (ws.name || "WS")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <DropdownMenuItem
                key={ws.id || ws.slug || idx}
                onClick={() => handleSelect(ws)}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  isCurrent
                    ? "bg-primary/15 text-foreground font-bold"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex size-6 items-center justify-center rounded-lg border border-border bg-muted font-bold text-[10px] text-primary shrink-0">
                  {wsInitials}
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {ws.name}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground font-mono">
                    {ws.plan || "Studio"}
                  </span>
                </div>
                {isCurrent && <Check className="size-3.5 text-primary shrink-0 ml-auto" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="bg-border my-1" />

        <DropdownMenuItem
          asChild
          className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/15 cursor-pointer transition-colors"
        >
          <Link href="/signup">
            <div className="flex size-6 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 shrink-0">
              <Plus className="size-3.5 text-primary" />
            </div>
            <span>Create New Workspace</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
