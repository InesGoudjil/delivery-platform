import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, BarChart3 } from "lucide-react";

async function getWorkspaceDetail(id: string) {
  const supabase = await createClient();
  try {
    const { data: workspace } = await (supabase as any)
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    const { data: projects } = await (supabase as any)
      .from('projects')
      .select('*')
      .eq('workspace_id', id)
      .order('created_at', { ascending: false });

    const { data: subscription } = await (supabase as any)
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', id)
      .maybeSingle();

    return { workspace, projects: projects ?? [], subscription };
  } catch {
    return null;
  }
}

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getWorkspaceDetail(id);

  if (!detail?.workspace) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-dim text-lg">Workspace not found.</p>
        <Link href="/admin/workspaces" className="text-orange text-sm font-semibold hover:underline mt-2 inline-block">
          Back to workspaces
        </Link>
      </div>
    );
  }

  const { workspace, projects, subscription } = detail;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 pb-6 border-b border-line">
        <Link href="/admin/workspaces" className="text-dim hover:text-ink transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">{workspace.brand_name}</h1>
          <p className="text-sm text-dim font-mono">{workspace.slug}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg2 border border-line rounded-2xl p-5">
          <p className="text-xs text-dim uppercase tracking-wider font-semibold mb-1">Storage</p>
          <p className="font-display font-bold text-lg">
            {Math.round(workspace.storage_limit_bytes / (1024 * 1024 * 1024))} GB
          </p>
        </div>
        <div className="bg-bg2 border border-line rounded-2xl p-5">
          <p className="text-xs text-dim uppercase tracking-wider font-semibold mb-1">Language</p>
          <p className="font-display font-bold text-lg">{workspace.default_language?.toUpperCase()}</p>
        </div>
        <div className="bg-bg2 border border-line rounded-2xl p-5">
          <p className="text-xs text-dim uppercase tracking-wider font-semibold mb-1">Projects</p>
          <p className="font-display font-bold text-lg">{projects.length}</p>
        </div>
      </div>

      <div className="bg-bg2 border border-line rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
          <CreditCardIcon className="w-4 h-4 text-orange" /> Subscription
        </h2>
        {subscription ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dim">Status:</span>{" "}
              <span className={`font-semibold ${
                subscription.status === "active" ? "text-emerald-400" :
                subscription.status === "trialing" ? "text-amber-400" :
                "text-dim"
              }`}>
                {subscription.status}
              </span>
            </div>
            <div>
              <span className="text-dim">Currency:</span>{" "}
              <span className="font-semibold">{subscription.currency}</span>
            </div>
            {subscription.trial_ends_at && (
              <div>
                <span className="text-dim">Trial Ends:</span>{" "}
                <span className="font-mono text-xs">{new Date(subscription.trial_ends_at).toLocaleDateString()}</span>
              </div>
            )}
            {subscription.current_period_end && (
              <div>
                <span className="text-dim">Period Ends:</span>{" "}
                <span className="font-mono text-xs">{new Date(subscription.current_period_end).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-dim text-sm">No subscription record found.</p>
        )}
      </div>

      <div className="bg-bg2 border border-line rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange" /> Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-dim text-sm">No projects yet.</p>
        ) : (
          <div className="space-y-2">
            {projects.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-line last:border-b-0">
                <div>
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-dim">
                    {p.status} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                  p.status === "in_review" ? "bg-orange/20 text-orange" :
                  "bg-bg3 text-dim"
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
