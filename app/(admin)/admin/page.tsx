import { createClient } from "@/lib/supabase/server";
import { Users, Building2, CreditCard, TrendingUp } from "lucide-react";

async function getAdminStats() {
  const supabase = await createClient();

  try {
    const { count: userCount } = await (supabase as any)
      .from('workspaces')
      .select('*', { count: 'exact', head: true });

    const { count: activeTrials } = await (supabase as any)
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trialing');

    const { count: activePaid } = await (supabase as any)
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: recentProjects } = await (supabase as any)
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return {
      totalWorkspaces: userCount ?? 0,
      activeTrials: activeTrials ?? 0,
      activePaid: activePaid ?? 0,
      recentProjects: recentProjects ?? 0,
    };
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="pb-6 border-b border-line">
        <h1 className="font-display text-3xl font-bold">Platform Dashboard</h1>
        <p className="text-sm text-dim mt-1">Overview of all workspaces, users, and subscriptions</p>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total Workspaces"
            value={stats.totalWorkspaces}
            color="text-orange"
          />
          <StatCard
            icon={Users}
            label="Active Trials"
            value={stats.activeTrials}
            color="text-amber-400"
          />
          <StatCard
            icon={CreditCard}
            label="Paid Subscriptions"
            value={stats.activePaid}
            color="text-emerald-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Projects This Week"
            value={stats.recentProjects}
            color="text-blue-400"
          />
        </div>
      ) : (
        <div className="bg-bg2 border border-line rounded-2xl p-8 text-center">
          <p className="text-dim text-sm">No data available yet. Ensure your Supabase tables are set up.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg2 border border-line rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg mb-4">Recent Activity</h2>
          <p className="text-dim text-sm">Workspace signups and project activity will appear here.</p>
        </div>
        <div className="bg-bg2 border border-line rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg mb-4">Subscription Breakdown</h2>
          <div className="space-y-3">
            <StatusBar label="Trialing" value={stats?.activeTrials ?? 0} total={(stats?.totalWorkspaces ?? 1)} color="bg-amber-400" />
            <StatusBar label="Active" value={stats?.activePaid ?? 0} total={(stats?.totalWorkspaces ?? 1)} color="bg-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-bg2 border border-line rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-xs text-dim uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-dim font-semibold">{label}</span>
        <span className="text-ink font-bold">{value}</span>
      </div>
      <div className="w-full h-2 bg-bg3 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
