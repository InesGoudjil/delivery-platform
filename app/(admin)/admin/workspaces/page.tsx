import type { SearchParams } from "nuqs/server";
import { requirePlatformAdminPage } from "@/core/admin/context";
import { AdminLoadError, AdminPageHeader } from "../../_components/page-header";
import { attempt } from "../../_lib/data";
import { formatNumber } from "../../_lib/format";
import { loadWorkspaceListParams, pageFrom } from "../../_lib/search-params";
import { WorkspacesTable } from "./workspaces-table";

export const metadata = { title: "Workspaces" };

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await requirePlatformAdminPage("/admin/workspaces");
  const params = await loadWorkspaceListParams(searchParams);
  const page = pageFrom(params.page);
  const pageSize = Number(params.size);

  const loaded = await attempt(() =>
    Promise.all([
      admin.readModel.listWorkspaces({
        search: params.q,
        plan: params.plan || null,
        status: params.status,
        flag: params.flag,
        sort: params.sort,
        desc: params.dir === "desc",
        page,
        pageSize,
      }),
      admin.services.subscription.listAllPlans(),
    ])
  );
  if (!loaded.ok) {
    return (
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader title="Workspaces" />
        <AdminLoadError what="workspaces" error={loaded.error} />
      </div>
    );
  }
  const [result, plans] = loaded.value;

  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader
        title="Workspaces"
        description={`${formatNumber(result.total)} ${result.total === 1 ? "workspace matches" : "workspaces match"}. Every workspace on the platform, with its owner, plan and usage.`}
      />
      <WorkspacesTable
        rows={result.rows}
        total={result.total}
        page={page}
        pageSize={pageSize}
        sort={{ key: params.sort, desc: params.dir === "desc" }}
        plans={plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          priceCents: plan.priceCents,
          currency: plan.currency,
          billingInterval: plan.billingInterval,
          isActive: plan.isActive,
        }))}
      />
    </div>
  );
}
