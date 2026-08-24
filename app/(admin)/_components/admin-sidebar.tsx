"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  ArrowLeft,
  Shield,
  HardDrive,
  Activity,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/admin",
      label: "Platform Overview",
      icon: LayoutDashboard,
      badge: "Live",
    },
    {
      href: "/admin/workspaces",
      label: "Studios & Workspaces",
      icon: Building2,
      badge: null,
    },
    {
      href: "/admin/users",
      label: "Creator Directory",
      icon: Users,
      badge: null,
    },
    {
      href: "/admin/subscriptions",
      label: "Revenue & Plans",
      icon: CreditCard,
      badge: "Stripe",
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r border-border p-6 flex flex-col justify-between shrink-0 shadow-sm">
      <div className="space-y-6">
        {/* Brand Header */}
        <div>
          <Link
            href="/admin"
            className="flex items-center gap-2.5 group"
          >
            <div className="size-8 rounded-xl bg-[#f5551d] text-black flex items-center justify-center font-black text-sm shadow-md shadow-[#f5551d]/20">
              C
            </div>
            <div>
              <div className="font-heading font-black text-lg tracking-tight text-foreground flex items-center gap-1.5">
                CineSpace
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#f5551d]/40 text-[#f5551d] bg-[#f5551d]/10 font-mono">
                  ADMIN
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                Platform Control Center
              </p>
            </div>
          </Link>
        </div>

        <Separator className="bg-border/60" />

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-3 mb-2">
            MANAGEMENT
          </div>
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-primary text-black font-bold shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className={cn("size-4", isActive ? "text-black" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                      isActive
                        ? "bg-black/20 text-black"
                        : "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* System Health Pulse Widget */}
        {/* <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cloudflare Edge
            </span>
            <span className="text-emerald-400 font-bold">99.98%</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#f5551d]" />
              Stream Queue
            </span>
            <span className="text-foreground font-semibold">Ready</span>
          </div>
        </div> */}
      </div>

      {/* Admin User Footer & Back Button */}
      {/* <div className="space-y-4 pt-6 border-t border-border mt-6">
        <div className="flex items-center gap-3 px-1">
          <Avatar className="size-8 border border-border">
            <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" />
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-foreground truncate">Platform Admin</p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">super_admin@cinespace.film</p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1.5 rounded-lg hover:bg-muted/50 font-medium"
        >
          <ArrowLeft className="size-3.5" /> Back to Creator Workspace
        </Link>
      </div> */}
    </aside>
  );
}
