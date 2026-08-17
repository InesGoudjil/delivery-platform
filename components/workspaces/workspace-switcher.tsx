"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Sparkles, Building2, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export interface WorkspaceItem {
  id?: string
  name: string
  slug?: string
  plan?: string
  logo?: React.ElementType | string | null
  accentColor?: string | null
}

export interface WorkspaceSwitcherProps {
  workspaces?: WorkspaceItem[]
  teams?: WorkspaceItem[]
  activeSlug?: string
  onSwitchWorkspace?: (slug: string) => void
}

export function WorkspaceSwitcher({
  workspaces,
  teams,
  activeSlug,
  onSwitchWorkspace,
}: WorkspaceSwitcherProps) {
  const list = workspaces || teams || []
  const { isMobile } = useSidebar()
  const router = useRouter()

  const [activeWorkspace, setActiveWorkspace] = React.useState<WorkspaceItem>(
    () => {
      const found = list.find((w) => w.slug === activeSlug)
      return found || list[0] || {
        id: "default",
        name: "My Studio",
        slug: "studio",
        plan: "Studio",
      }
    }
  )

  React.useEffect(() => {
    if (activeSlug) {
      const found = list.find((w) => w.slug === activeSlug)
      if (found) setActiveWorkspace(found)
    }
  }, [activeSlug, list])

  const initials = (activeWorkspace.name || "WS")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const handleSelectWorkspace = (ws: WorkspaceItem) => {
    setActiveWorkspace(ws)
    if (onSwitchWorkspace && ws.slug) {
      onSwitchWorkspace(ws.slug)
    } else if (ws.slug) {
      router.push(`/${ws.slug}`)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-white/[0.06] transition-colors rounded-xl"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs shadow-md shadow-[#f5551d]/20 shrink-0">
                {initials}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-[#f6f3ec]">
                  {activeWorkspace.name}
                </span>
                <span className="truncate text-xs text-[#9a9a9f] font-mono">
                  {activeWorkspace.plan || "Studio"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-[#71717a] group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-2xl bg-[#141416] border border-white/15 text-[#f6f3ec] p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs text-[#9a9a9f] font-mono px-2 py-1 uppercase tracking-wider">
              Workspaces
            </DropdownMenuLabel>

            {list.map((ws, index) => {
              const wsInitials = (ws.name || "WS")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
              const isCurrent = ws.slug ? ws.slug === activeWorkspace.slug : ws.name === activeWorkspace.name

              return (
                <DropdownMenuItem
                  key={ws.id || ws.slug || ws.name}
                  onClick={() => handleSelectWorkspace(ws)}
                  className="gap-2.5 p-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border border-white/20 bg-white/5 font-bold text-[10px] text-[#f5551d]">
                    {wsInitials}
                  </div>
                  <div className="flex flex-col flex-1 truncate">
                    <span className="font-semibold text-[#f6f3ec]">{ws.name}</span>
                    <span className="text-[10px] text-[#71717a]">{ws.plan || "Studio plan"}</span>
                  </div>
                  {isCurrent && <Check className="size-3.5 text-[#f5551d] ml-auto" />}
                  <DropdownMenuShortcut className="text-[10px] font-mono text-[#71717a]">
                    ⌘{index + 1}
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              )
            })}

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            <DropdownMenuItem
              asChild
              className="gap-2.5 p-2 rounded-xl text-xs font-semibold text-[#f5551d] hover:bg-[#f5551d]/15 cursor-pointer transition-colors"
            >
              <Link href="/new-workspace">
                <div className="flex size-6 items-center justify-center rounded-md border border-[#f5551d]/40 bg-[#f5551d]/10">
                  <Plus className="size-3.5 text-[#f5551d]" />
                </div>
                <span>Create Workspace</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export const TeamSwitcher = WorkspaceSwitcher
