import type { SearchParams } from "nuqs/server";
import { requirePlatformAdminPage } from "@/core/admin/context";
import { AdminLoadError, AdminPageHeader } from "../../_components/page-header";
import { attempt } from "../../_lib/data";
import { formatNumber } from "../../_lib/format";
import { loadUserListParams, pageFrom } from "../../_lib/search-params";
import { UsersTable } from "./users-table";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requirePlatformAdminPage("/admin/users");
  const params = await loadUserListParams(searchParams);
  const page = pageFrom(params.page);
  const pageSize = Number(params.size);

  const loaded = await attempt(() =>
    admin.readModel.listUsers({
      search: params.q,
      role: params.role,
      flag: params.flag,
      sort: params.sort,
      desc: params.dir === "desc",
      page,
      pageSize,
    })
  );
  if (!loaded.ok) {
    return (
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader title="Users" />
        <AdminLoadError what="users" error={loaded.error} />
      </div>
    );
  }
  const result = loaded.value;

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="Users"
        description={`${formatNumber(result.total)} ${result.total === 1 ? "account matches" : "accounts match"}. Emails, sign-ins and two-factor status come from Supabase Auth.`}
      />
      <UsersTable
        rows={result.rows}
        total={result.total}
        page={page}
        pageSize={pageSize}
        sort={{ key: params.sort, desc: params.dir === "desc" }}
        currentUserId={admin.user.id}
      />
    </div>
  );
}
