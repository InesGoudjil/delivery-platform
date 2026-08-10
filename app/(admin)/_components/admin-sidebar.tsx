"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, CreditCard, ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  ];

  return (
    <aside className="w-full md:w-64 bg-bg2 border-b md:border-b-0 md:border-r border-line p-6 flex flex-col justify-between shrink-0">
      <div>
        <Link href="/admin" className="font-display text-2xl font-black text-ink block mb-8">
          CUT<span className="text-orange">.</span>
          <span className="text-[10px] uppercase tracking-widest text-faint ml-2 border border-line px-2 py-0.5 rounded-full font-mono font-normal">
            Admin
          </span>
        </Link>

        <nav className="space-y-1">
          {links.map((link) => {
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
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
        </nav>
      </div>

      <div className="border-t border-line pt-4 mt-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-dim hover:text-ink transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Site
        </Link>
      </div>
    </aside>
  );
}
