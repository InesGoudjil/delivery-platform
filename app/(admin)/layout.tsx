import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { requirePlatformAdminPage } from "@/core/admin/context";
import { AdminSidebar } from "./_components/admin-sidebar";
import { getAdminKpis } from "./_lib/data";
import { buildAdminNav } from "./_modules/registry";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Every admin page checks again: Next.js doesn't re-run this layout on every navigation.
  const admin = await requirePlatformAdminPage("/admin");
  const kpis = await getAdminKpis().catch(() => null);

  return (
    <NuqsAdapter>
      <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
        <AdminSidebar items={buildAdminNav(kpis)} adminEmail={admin.user.email ?? null} />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </NuqsAdapter>
  );
}
