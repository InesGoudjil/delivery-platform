"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function NavDocuments({
  title,
  items,
}: {
  title?: string;
  items: {
    name: string;
    url: string;
    icon?: LucideIcon | React.ComponentType<{ className?: string }>;
    exact?: boolean;
  }[];
}) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden p-0">
      {title && (
        <SidebarGroupLabel className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5e5e64] px-3 mb-1.5 h-auto">
          {title}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.url
            : pathname === item.url || (item.url.includes("#") ? pathname === item.url.split("#")[0] : pathname.startsWith(item.url));

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                tooltip={item.name}
                isActive={isActive}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 h-auto",
                  isActive
                    ? "bg-white/[0.08] text-[#f6f3ec] font-semibold"
                    : "text-[#8e8e93] hover:text-[#f6f3ec] hover:bg-white/[0.04]"
                )}
              >
                <Link href={item.url}>
                  {item.icon && (
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive ? "text-[#f5551d]" : "text-[#8e8e93]"
                      )}
                    />
                  )}
                  <span className="truncate">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
