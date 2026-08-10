import { createClient } from "@/lib/supabase/server";
import { CreditCard } from "lucide-react";

async function getSubscriptions() {
  const supabase = await createClient();
  try {
    const { data } = await (supabase as any)
      .from('subscriptions')
      .select(`
        *,
        workspace:workspace_id (brand_name, slug)
      `)
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function AdminSubscriptionsPage() {
  const subscriptions = await getSubscriptions();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="pb-6 border-b border-line">
        <h1 className="font-display text-3xl font-bold">Subscriptions</h1>
        <p className="text-sm text-dim mt-1">Manage billing and trial status across all workspaces</p>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "trialing", "active", "past_due", "canceled"].map((s) => (
          <span
            key={s}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              s === "all"
                ? "bg-bg3 text-dim border border-line"
                : s === "active"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : s === "trialing"
                ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                : "bg-bg3 text-dim border border-line"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </span>
        ))}
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-bg2 border border-line rounded-2xl p-12 text-center">
          <CreditCard className="w-10 h-10 text-dim mx-auto mb-3" />
          <p className="text-dim text-sm">No subscriptions yet.</p>
        </div>
      ) : (
        <div className="bg-bg2 border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Workspace</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Currency</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Trial Ends</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Period Ends</th>
                  <th className="text-right p-4 text-xs font-semibold text-dim uppercase tracking-wider">Stripe ID</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub: any) => (
                  <tr key={sub.id} className="border-b border-line last:border-b-0 hover:bg-bg3/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange/20 border border-orange/40 text-orange flex items-center justify-center text-xs font-bold">
                          {sub.workspace?.brand_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{sub.workspace?.brand_name || "—"}</p>
                          <p className="text-xs text-dim font-mono">{sub.workspace?.slug || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                        sub.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : sub.status === "trialing"
                          ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                          : sub.status === "past_due"
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : "bg-bg3 text-dim border border-line"
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-dim">{sub.currency || "AED"}</td>
                    <td className="p-4 text-xs font-mono text-dim">
                      {sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4 text-xs font-mono text-dim">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4 text-right text-xs font-mono text-dim truncate max-w-[120px]">
                      {sub.payment_provider_sub_id?.slice(0, 12) || "—"}
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
