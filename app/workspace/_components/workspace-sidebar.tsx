"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Palette, Settings, ExternalLink, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceSidebarProps {
  workspaceSlug: string;
  workspaceName: string;
  accentColor?: string | null;
  userEmail?: string;
}

export function WorkspaceSidebar({
  workspaceSlug,
  workspaceName,
  accentColor,
  userEmail,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();

  const initials = workspaceName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const links = [
    {
      href: `/workspace/${workspaceSlug}`,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `/workspace/${workspaceSlug}/projects`,
      label: "Projects",
      icon: Film,
    },
    {
      href: `/workspace/${workspaceSlug}/portfolio`,
      label: "Portfolio",
      icon: Palette,
    },
    {
      href: `/workspace/${workspaceSlug}/settings`,
      label: "Brand Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-bg2 border-b md:border-b-0 md:border-r border-line p-6 flex flex-col justify-between shrink-0">
      <div>
        <Link
          href={`/workspace/${workspaceSlug}`}
          className="font-display text-2xl font-black text-ink block mb-8"
        >
          CUT<span className="text-orange">.</span>
          <span className="text-[10px] uppercase tracking-widest text-faint ml-2 border border-line px-2 py-0.5 rounded-full font-mono font-normal">
            Studio
          </span>
        </Link>

        <nav className="space-y-1">
          {links.map((link) => {
            const isActive =
              link.href === `/workspace/${workspaceSlug}`
                ? pathname === `/workspace/${workspaceSlug}`
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition",
                  isActive
                    ? "bg-bg3 text-orange border border-line"
                    : "text-dim hover:text-ink hover:bg-bg3/50"
                )}
              >
                <link.icon className="w-4 h-4" /> {link.label}
              </Link>
            );
          })}

          <Link
            href={`/p/workspace/${workspaceSlug}`}
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-dim hover:text-ink hover:bg-bg3/50 transition"
          >
            <ExternalLink className="w-4 h-4 text-orange" /> Public Portfolio
          </Link>
        </nav>
      </div>

      <div className="border-t border-line pt-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full bg-orange/20 border border-orange/40 text-orange flex items-center justify-center text-xs font-bold"
              style={accentColor ? { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor } : undefined}
            >
              {initials}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-ink truncate max-w-[120px]">
                {workspaceName}
              </p>
              <p className="text-[10px] text-faint truncate max-w-[120px]">
                {userEmail || "Studio"}
              </p>
            </div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-faint hover:text-ink transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
