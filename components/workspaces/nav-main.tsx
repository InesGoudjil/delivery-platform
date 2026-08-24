"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export interface NavSubItem {
  title: string
  url: string
}

export interface NavMainItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavSubItem[]
}

export interface NavMainProps {
  items: NavMainItem[]
  groupLabel?: string
}

export function NavMain({ items, groupLabel = "Platform" }: NavMainProps) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {groupLabel && (
        <SidebarGroupLabel className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] px-2 mb-1 group-data-[collapsible=icon]:hidden">
          {groupLabel}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0
          const isCurrentActive = item.isActive !== undefined
            ? item.isActive
            : item.url === "/"
            ? pathname === "/"
            : pathname === item.url || pathname.startsWith(item.url)

          if (!hasSubItems) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isCurrentActive}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150",
                    isCurrentActive
                      ? "bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30 font-bold"
                      : "text-[#a1a1aa] hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <Link href={item.url}>
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "size-4 shrink-0",
                          isCurrentActive ? "text-[#f5551d]" : "text-[#71717a]"
                        )}
                      />
                    )}
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || isCurrentActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150",
                      isCurrentActive
                        ? "text-[#f5551d] font-bold"
                        : "text-[#a1a1aa] hover:text-white hover:bg-white/[0.06]"
                    )}
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "size-4 shrink-0",
                          isCurrentActive ? "text-[#f5551d]" : "text-[#71717a]"
                        )}
                      />
                    )}
                    <span className="truncate">{item.title}</span>
                    <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-[#71717a]" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub className="my-1 ml-3.5 border-l border-white/10 pl-2.5 space-y-1">
                    {item.items?.map((subItem) => {
                      const isSubActive = pathname === subItem.url

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubActive}
                            className={cn(
                              "text-xs px-2.5 py-1.5 rounded-lg transition-colors",
                              isSubActive
                                ? "bg-white/10 text-white font-semibold"
                                : "text-[#a1a1aa] hover:text-white hover:bg-white/5"
                            )}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
