import { redirect } from "next/navigation";
import { getServerServices } from "@/core/server";
import Link from "next/link";
import { Plus, Film, ArrowRight } from "lucide-react";
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyLead,
  TypographyMuted,
  TypographyKicker,
  Typography,
} from "@/components/ui/typography";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    redirect("/");
  }

  const projects = await services.delivery.listWorkspaceDeliveries(workspace.id);

  const draftCount = projects.filter((p) => p.status === "draft").length;
  const inReviewCount = projects.filter((p) => p.status === "in_review").length;
  const approvedCount = projects.filter((p) => p.status === "approved").length;

  return (
    <div className="w-full space-y-8">
      <div className="pb-6 border-b border-line">
        <TypographyH1 className="text-3xl font-bold font-heading">
          Welcome back, {workspace.brandName}
        </TypographyH1>
        <TypographyLead className="text-sm text-dim mt-1">
          Manage your projects, portfolio, and client deliveries
        </TypographyLead>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Drafts" count={draftCount} color="text-dim" />
        <StatCard label="In Review" count={inReviewCount} color="text-orange" />
        <StatCard label="Approved" count={approvedCount} color="text-emerald-400" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <TypographyH2 className="text-xl font-bold font-heading border-none pb-0">
            Recent Deliveries
          </TypographyH2>
          <Link
            href={`/${workspaceSlug}/deliveries`}
            className="text-xs font-semibold text-orange hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="bg-bg2 border border-line rounded-2xl p-12 text-center">
            <Film className="w-10 h-10 text-dim mx-auto mb-3" />
            <TypographyMuted className="text-dim text-sm">No projects yet.</TypographyMuted>
            <Link
              href={`/${workspaceSlug}/deliveries`}
              className="btn px-5 py-2.5 rounded-full text-sm font-bold mt-4 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                href={`/${workspaceSlug}/deliveries/${project.id}`}
                className="bg-bg2 border border-line rounded-2xl p-5 hover:border-orange/40 transition flex items-center justify-between"
              >
                <div>
                  <TypographyH3 className="font-heading font-bold text-sm">
                    {project.title}
                  </TypographyH3>
                  <TypographyMuted className="text-xs text-dim mt-1">
                    {project.status === "draft"
                      ? "Draft"
                      : project.status === "in_review"
                      ? "In Review"
                      : project.status === "approved"
                      ? "Approved"
                      : "Archived"}
                  </TypographyMuted>
                </div>
                <ArrowRight className="w-4 h-4 text-dim" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="bg-bg2 border border-line rounded-2xl p-5">
      <TypographyKicker className="text-xs text-dim uppercase tracking-wider font-semibold mb-1 block">
        {label}
      </TypographyKicker>
      <Typography className={`text-3xl font-bold font-heading ${color}`}>{count}</Typography>
    </div>
  );
}
