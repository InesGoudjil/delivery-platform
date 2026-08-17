"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronsUpDown,
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
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarBadge,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { signOutAction } from "@/app/actions/auth"

export interface NavUserProps {
  user: {
    name: string
    email: string
    avatar?: string | null
    planName?: string
    workspaceSlug?: string
  }
  onSignOut?: () => void
}

export function NavUser({ user, onSignOut }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [isPending, startTransition] = React.useTransition()

  const initials = (user.name || "PC")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const workspaceSlug = user.workspaceSlug || "studio"
  const planPill = user.planName ? `${user.planName} plan` : "Studio plan"

  const handleLogout = () => {
    if (onSignOut) {
      onSignOut()
      return
    }
    startTransition(async () => {
      await signOutAction()
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-white/[0.06] transition-colors rounded-xl outline-none"
            >
              <Avatar size="sm" className="size-8 ring-1 ring-white/10 shrink-0">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                  {initials}
                </AvatarFallback>
                <AvatarBadge className="bg-[#86b98f] ring-2 ring-[#0c0c0e]" />
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-[#f6f3ec]">
                  {user.name}
                </span>
                <span className="truncate text-xs text-[#71717a] font-mono">
                  {user.email}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto size-4 text-[#71717a] group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--anchor-width) min-w-64 rounded-2xl bg-[#141416] border border-white/15 text-[#f6f3ec] p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            {/* Identity Header: pdrop-id */}
            <DropdownMenuLabel className="p-2.5 space-y-1.5 font-normal">
              <div className="flex items-center gap-3">
                <Avatar size="sm" className="size-9 ring-1 ring-white/20 shrink-0">
                  {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-[#f5551d] to-[#ff8a45] text-black font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 truncate leading-tight">
                  <span className="font-bold text-sm text-[#f6f3ec] truncate">
                    {user.name}
                  </span>
                  <span className="text-xs text-[#9a9a9f] font-mono truncate">
                    {user.email}
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#f5551d]/15 text-[#f5551d] border border-[#f5551d]/30">
                      {planPill}
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

            {/* Logout Action: pd-danger */}
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
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
