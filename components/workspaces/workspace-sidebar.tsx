"use client";

import * as React from "react";
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
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/app/actions/auth";
import { NavDocuments } from "./nav-documents";

export interface WorkspaceSidebarProps extends React.ComponentProps<
  typeof Sidebar
> {
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

export function WorkspaceSidebar({
  workspace,
  workspaces = [],
  user,
  profile,
  plan,
  onSignOut,
  ...props
}: WorkspaceSidebarProps) {
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

  const data = {
    documents: [
      {
        name: "Profile",
        url: `/${workspaceSlug}/settings`,
        icon: Pencil,
        exact: true,
      },
      {
        name: "Portfolio",
        url: `/${workspaceSlug}/portfolio`,
        icon: LayoutGrid,
      },
      {
        name: "Client Deliveries",
        url: `/${workspaceSlug}/deliveries`,
        icon: Link2,
      },
      {
        name: "Storage & Usage",
        url: `/${workspaceSlug}/storage`,
        icon: Upload,
      },
    ],
    account: [
      {
        name: "Add your branding",
        url: `/${workspaceSlug}/settings#branding`,
        icon: Pencil,
      },
      {
        name: "Subscription",
        url: `/${workspaceSlug}/subscription`,
        icon: Star,
      },
      {
        name: "Billing",
        url: `/${workspaceSlug}/billing`,
        icon: Download,
      },
      {
        name: "Security",
        url: `/${workspaceSlug}/security`,
        icon: Lock,
      },
      {
        name: "Notifications",
        url: `/${workspaceSlug}/notifications`,
        icon: MessageSquare,
      },
    ],
    support: [
      {
        name: "Help Center",
        url: `/${workspaceSlug}/help`,
        icon: MessageCircle,
      },
      {
        name: "Contact Us",
        url: `/${workspaceSlug}/help#contact`,
        icon: Send,
      },
      {
        name: "Documentation",
        url: `/${workspaceSlug}/docs`,
        icon: BookOpen,
      },
    ],
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/[0.08] bg-[#0c0c0e] text-[#f6f3ec]"
      {...props}
    >
      <SidebarHeader className="hidden" />

      <SidebarContent className="px-3 py-6 space-y-6">
        <NavDocuments title="WORKSPACE" items={data.documents} />
        <NavDocuments title="ACCOUNT" items={data.account} />
        <NavDocuments title="SUPPORT" items={data.support} />
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-white/[0.08]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isPending}
              tooltip="Log out"
              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[#f5551d] hover:text-[#ff8a45] hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <ArrowRight className="size-4 shrink-0 text-[#f5551d] rtl:rotate-180" />
              <span>{isPending ? "Logging out..." : "Log out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default WorkspaceSidebar;
