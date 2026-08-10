import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

async function getWorkspaces() {
  const supabase = await createClient();
  try {
    const { data } = await (supabase as any)
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function AdminWorkspacesPage() {
  const workspaces = await getWorkspaces();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="pb-6 border-b border-line">
        <h1 className="font-display text-3xl font-bold">Workspaces</h1>
        <p className="text-sm text-dim mt-1">All filmmaker workspaces on the platform</p>
      </div>

      {workspaces.length === 0 ? (
        <div className="bg-bg2 border border-line rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-dim mx-auto mb-3" />
          <p className="text-dim text-sm">No workspaces created yet.</p>
        </div>
      ) : (
        <div className="bg-bg2 border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Brand</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Slug</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Storage</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Created</th>
                  <th className="text-right p-4 text-xs font-semibold text-dim uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((w: any) => (
                  <tr key={w.id} className="border-b border-line last:border-b-0 hover:bg-bg3/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange/20 border border-orange/40 text-orange flex items-center justify-center text-xs font-bold">
                          {w.brand_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">{w.brand_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-mono text-orange">{w.slug || "—"}</td>
                    <td className="p-4 text-xs text-dim">
                      {formatBytes(w.storage_limit_bytes)}
                    </td>
                    <td className="p-4 text-xs text-dim font-mono">
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/workspaces/${w.id}`}
                        className="text-xs text-orange hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        Details <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(0)} GB`;
}
