import type { SearchParams } from "nuqs/server";
import { requirePlatformAdminPage } from "@/core/admin/context";
import { AdminLoadError, AdminPageHeader } from "../../_components/page-header";
import { attempt } from "../../_lib/data";
import { loadWaitlistParams, pageFrom } from "../../_lib/search-params";
import { WaitlistClient } from "./waitlist-client";

export const metadata = { title: "Waitlist" };

export default async function AdminWaitlistPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requirePlatformAdminPage("/admin/waitlist");
  const params = await loadWaitlistParams(searchParams);
  const page = pageFrom(params.page);
  const pageSize = Number(params.size);

  const loaded = await attempt(() =>
    Promise.all([admin.services.waitlist.getDashboardMetrics(), admin.services.waitlist.listPendingPage(page, pageSize)])
  );
  if (!loaded.ok) {
    return (
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader title="Waitlist" />
        <AdminLoadError what="the waitlist" error={loaded.error} />
      </div>
    );
  }
  const [metrics, queue] = loaded.value;

  return (
    <div className="mx-auto max-w-7xl">
      <WaitlistClient metrics={metrics} entries={queue.entries} total={queue.total} page={page} pageSize={pageSize} />
    </div>
  );
}
