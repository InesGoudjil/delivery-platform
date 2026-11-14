import type { SearchParams } from "nuqs/server";
import { requirePlatformAdminPage } from "@/core/admin/context";
import { AdminLoadError, AdminPageHeader } from "../../_components/page-header";
import { attempt } from "../../_lib/data";
import { formatNumber } from "../../_lib/format";
import { idFrom, loadAuditListParams, pageFrom } from "../../_lib/search-params";
import { AuditTable } from "./audit-table";

export const metadata = { title: "Audit log" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requirePlatformAdminPage("/admin/audit");
  const params = await loadAuditListParams(searchParams);
  const page = pageFrom(params.page);
  const pageSize = Number(params.size);

  const loaded = await attempt(() =>
    Promise.all([
      admin.audit.list({
        action: params.action || null,
        targetType: params.target || null,
        actorId: idFrom(params.actor),
        outcome: params.outcome,
        page,
        pageSize,
      }),
      // For the admin filter: everyone who's a platform admin now.
      admin.readModel.listUsers({ role: "admin", sort: "email", desc: false, page: 1, pageSize: 100 }),
    ])
  );
  if (!loaded.ok) {
    return (
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader title="Audit log" />
        <AdminLoadError what="the audit log" error={loaded.error} />
      </div>
    );
  }
  const [result, admins] = loaded.value;

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="Audit log"
        description={`${formatNumber(result.total)} ${result.total === 1 ? "change" : "changes"}. Every platform-admin change, with who made it and why. Entries can't be edited or deleted.`}
      />
      <AuditTable
        rows={result.rows}
        total={result.total}
        page={page}
        pageSize={pageSize}
        admins={admins.rows.map((user) => ({ id: user.id, email: user.email ?? user.id }))}
      />
    </div>
  );
}
