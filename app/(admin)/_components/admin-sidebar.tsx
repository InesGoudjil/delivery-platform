"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AdminIconName, AdminNavGroup, AdminNavItem } from "../_modules/registry";
import { AdminCommandMenu } from "./admin-command-menu";

const ICONS: Record<AdminIconName, LucideIcon> = {
  overview: LayoutDashboard,
  workspaces: Building2,
  users: Users,
  billing: CreditCard,
  waitlist: Sparkles,
  notifications: Bell,
  audit: ScrollText,
};

const GROUP_ORDER: AdminNavGroup[] = ["Overview", "Customers", "Billing", "Growth", "Operations", "System"];

export function AdminSidebar({ items, adminEmail }: { items: AdminNavItem[]; adminEmail: string | null }) {
  const pathname = usePathname();
  const groups = GROUP_ORDER.map((group) => ({ group, items: items.filter((item) => item.group === group) })).filter(
    (entry) => entry.items.length > 0
  );

  return (
    <aside className="w-full shrink-0 border-b border-border bg-card md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:justify-between md:border-r md:border-b-0">
      <div className="flex flex-col gap-4 p-4 md:p-5">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/images/logo.svg" alt="CineSpace" className="block h-5 w-auto select-none object-contain" />
          <Badge variant="outline" className="border-primary/40 bg-primary/10 px-1.5 py-0 text-[10px] text-primary">
            ADMIN
          </Badge>
        </Link>

        <AdminCommandMenu items={items} />

        <nav aria-label="Admin sections" className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-col md:gap-4 md:overflow-visible">
          {groups.map(({ group, items: groupItems }) => (
            <div key={group} className="flex gap-1 md:flex-col md:gap-0.5">
              <p className="hidden px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:block">
                {group}
              </p>
              {groupItems.map((item) => {
                const Icon = ICONS[item.icon];
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/15 font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                      {item.label}
                    </span>
                    {item.badge !== null && (
                      <span
                        className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums"
                        aria-label={`${item.badge} need a look`}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="hidden border-t border-border p-5 md:block">
        {adminEmail && <p className="mb-2 truncate text-xs text-muted-foreground">{adminEmail}</p>}
        <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to the app
        </Link>
      </div>
    </aside>
  );
}
