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
import { TypographySpan, TypographyKicker } from "@/components/ui/typography";

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
    <SidebarGroup className="p-0">
      {title && (
        <SidebarGroupLabel className="px-3 mb-1.5 h-auto group-data-[collapsible=icon]:hidden">
          <TypographyKicker
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70"
          >
            {title}
          </TypographyKicker>
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
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 h-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Link href={item.url}>
                  {item.icon && (
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  )}
                  <TypographySpan
                    variant="small"
                    className="truncate group-data-[collapsible=icon]:hidden text-xs font-medium"
                  >
                    {item.name}
                  </TypographySpan>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
