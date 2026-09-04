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

import { WorkspaceSwitcher, WorkspaceItem } from "./workspace-switcher";

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
        name: "Subscription & Billing",
        url: `/${workspaceSlug}/subscription`,
        icon: Star,
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
  };

  const brandName = workspace?.brandName || "Pedro Concreato";
  const planName = plan?.name || "Studio";

  const listToMap = workspaces.length > 0 ? workspaces : workspace ? [workspace] : [];
  const workspaceItems: WorkspaceItem[] = listToMap.map((w) => ({
    id: w.id,
    name: w.brandName,
    slug: w.slug,
    plan: planName ? `${planName} plan` : "Studio plan",
  }));

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-colors duration-200"
      {...props}
    >
      <SidebarHeader className="p-3 border-b border-sidebar-border">
        <WorkspaceSwitcher
          workspaces={workspaceItems}
          activeSlug={workspaceSlug}
        />
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 space-y-6">
        <NavDocuments title="WORKSPACE" items={data.documents} />
        <NavDocuments title="ACCOUNT" items={data.account} />
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isPending}
              tooltip="Log out"
              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
            >
              <ArrowRight className="size-4 shrink-0 text-destructive rtl:rotate-180" />
              <span className="group-data-[collapsible=icon]:hidden">
                {isPending ? "Logging out..." : "Log out"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default WorkspaceSidebar;
