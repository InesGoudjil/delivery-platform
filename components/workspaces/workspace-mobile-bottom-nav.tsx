"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link2, LayoutGrid, HardDrive, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceMobileBottomNavProps {
  workspaceSlug: string;
}

export function WorkspaceMobileBottomNav({
  workspaceSlug,
}: WorkspaceMobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Deliveries",
      href: `/${workspaceSlug}/deliveries`,
      icon: Link2,
      isActive:
        pathname.includes(`/${workspaceSlug}/deliveries`) ||
        pathname === `/${workspaceSlug}`,
    },
    {
      name: "Portfolio",
      href: `/${workspaceSlug}/portfolio`,
      icon: LayoutGrid,
      isActive: pathname.includes(`/${workspaceSlug}/portfolio`),
    },
    {
      name: "Storage",
      href: `/${workspaceSlug}/storage`,
      icon: HardDrive,
      isActive: pathname.includes(`/${workspaceSlug}/storage`),
    },
    {
      name: "Settings",
      href: `/${workspaceSlug}/settings`,
      icon: Settings,
      isActive:
        pathname.includes(`/${workspaceSlug}/settings`) ||
        pathname.includes(`/${workspaceSlug}/members`) ||
        pathname.includes(`/${workspaceSlug}/security`) ||
        pathname.includes(`/${workspaceSlug}/subscription`),
    },
  ];

  return (
    <nav
      aria-label="Workspace mobile navigation"
      className="md:hidden fixed bottom-3 inset-x-0 mx-auto w-[calc(100%-2rem)] max-w-[340px] z-40 liquid-glass rounded-full p-1.5 px-2 shadow-[0_12px_36px_rgba(0,0,0,0.6)] mb-safe"
    >
      <div className="flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-1.5 rounded-full transition-all min-h-[42px] touch-manipulation active:scale-95 group",
                item.isActive
                  ? "text-primary bg-white/[0.08] shadow-inner font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "size-4 sm:size-4.5 transition-transform duration-150",
                    item.isActive ? "scale-105 text-primary" : "group-hover:scale-105"
                  )}
                />
                {item.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
                )}
              </div>
              <span className="text-[9.5px] tracking-tight mt-0.5 leading-none font-medium truncate">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
