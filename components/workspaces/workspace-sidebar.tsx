"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Pencil,
  LayoutGrid,
  Link2,
  Upload,
  Star,
  Download,
  Lock,
  MessageSquare,
  MessageCircle,
  Send,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/app/actions/auth";
import { useTranslation } from "@/i18n";

export interface WorkspaceSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspace?: {
    id: string;
    brandName: string;
    slug: string;
    logoUrl?: string | null;
    accentColor?: string | null;
    accountType?: "individual" | "studio";
    storageUsedBytes?: number;
  } | null;
  workspaces?: Array<{
    id: string;
    brandName: string;
    slug: string;
    accountType?: string;
  }>;
  user?: {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
      [key: string]: any;
    };
  } | null;
  profile?: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    platformRole?: "user" | "admin";
  } | null;
  plan?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  onSignOut?: () => void;
}

interface SidebarNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

export function WorkspaceSidebar({
  workspace,
  workspaces = [],
  user,
  profile,
  plan,
  onSignOut,
  ...props
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const { dict } = useTranslation();
  const [isPending, startTransition] = React.useTransition();

  const workspaceSlug = workspace?.slug || "studio";

  const handleLogout = () => {
    if (onSignOut) {
      onSignOut();
      return;
    }
    startTransition(async () => {
      await signOutAction();
    });
  };

  // Groups matching the exact screenshot layout
  const navigationGroups: SidebarNavGroup[] = [
    {
      label: "WORKSPACE",
      items: [
        {
          title: "Profile",
          url: `/${workspaceSlug}/settings`,
          icon: Pencil,
          exact: true,
        },
        {
          title: "Portfolio",
          url: `/${workspaceSlug}/portfolio`,
          icon: LayoutGrid,
        },
        {
          title: "Client Deliveries",
          url: `/${workspaceSlug}/deliveries`,
          icon: Link2,
        },
        {
          title: "Storage & Usage",
          url: `/${workspaceSlug}/storage`,
          icon: Upload,
        },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        {
          title: "Add your branding",
          url: `/${workspaceSlug}/settings#branding`,
          icon: Pencil,
        },
        {
          title: "Subscription",
          url: `/${workspaceSlug}/subscription`,
          icon: Star,
        },
        {
          title: "Billing",
          url: `/${workspaceSlug}/billing`,
          icon: Download,
        },
        {
          title: "Security",
          url: `/${workspaceSlug}/security`,
          icon: Lock,
        },
        {
          title: "Notifications",
          url: `/${workspaceSlug}/notifications`,
          icon: MessageSquare,
        },
      ],
    },
    {
      label: "SUPPORT",
      items: [
        {
          title: "Help Center",
          url: `/${workspaceSlug}/help`,
          icon: MessageCircle,
        },
        {
          title: "Contact Us",
          url: `/${workspaceSlug}/help#contact`,
          icon: Send,
        },
        {
          title: "Documentation",
          url: `/${workspaceSlug}/docs`,
          icon: BookOpen,
        },
      ],
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/[0.08] bg-[#0c0c0e] text-[#f6f3ec]"
      {...props}
    >
      <SidebarContent className="px-3 py-5 space-y-6">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#5e5e64] px-3 mb-2 h-auto group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.url
                    : pathname === item.url || pathname.startsWith(item.url.split("#")[0]);

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        className={cn(
                          "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 h-auto",
                          isActive
                            ? "bg-white/[0.08] text-[#f6f3ec] font-semibold shadow-sm"
                            : "text-[#8e8e93] hover:text-[#f6f3ec] hover:bg-white/[0.04]"
                        )}
                      >
                        <Link href={item.url}>
                          <item.icon
                            className={cn(
                              "size-4 shrink-0 transition-colors",
                              isActive ? "text-[#f5551d]" : "text-[#8e8e93]"
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer with Log out */}
      <SidebarFooter className="p-3 border-t border-white/[0.08]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isPending}
              tooltip="Log out"
              className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#f5551d] hover:text-[#ff8a45] hover:bg-white/[0.04] transition-colors cursor-pointer h-auto"
            >
              <ArrowRight className="size-4 shrink-0 text-[#f5551d] rtl:rotate-180" />
              <span className="truncate">{isPending ? "Logging out..." : "Log out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default WorkspaceSidebar;