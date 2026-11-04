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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-2xl border-t border-border/40 pb-safe pt-1.5 px-3 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[48px] touch-manipulation active:scale-95 group",
                item.isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "size-5 transition-transform duration-150",
                    item.isActive ? "scale-110 text-primary" : "group-hover:scale-105"
                  )}
                />
                {item.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 leading-none font-medium">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
