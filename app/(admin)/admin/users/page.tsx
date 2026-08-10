import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowRight, Search, Shield } from "lucide-react";

async function getUsers() {
  const supabase = await createClient();
  try {
    const { data: adminUsers } = await supabase.auth.admin.listUsers();
    return adminUsers?.users ?? [];
  } catch {
    return [];
  }
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="pb-6 border-b border-line">
        <h1 className="font-display text-3xl font-bold">User Management</h1>
        <p className="text-sm text-dim mt-1">View and manage platform users</p>
      </div>

      {users.length === 0 ? (
        <div className="bg-bg2 border border-line rounded-2xl p-12 text-center">
          <Shield className="w-10 h-10 text-dim mx-auto mb-3" />
          <p className="text-dim text-sm">
            User listing requires the Supabase service role key. Set <code className="text-orange bg-bg3 px-1 py-0.5 rounded text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in your env.
          </p>
        </div>
      ) : (
        <div className="bg-bg2 border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">User</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Email</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Joined</th>
                  <th className="text-left p-4 text-xs font-semibold text-dim uppercase tracking-wider">Role</th>
                  <th className="text-right p-4 text-xs font-semibold text-dim uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-line last:border-b-0 hover:bg-bg3/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bg3 border border-line flex items-center justify-center text-xs font-bold text-dim">
                          {u.email?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-semibold">{u.user_metadata?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-dim">{u.email}</td>
                    <td className="p-4 text-xs text-dim font-mono">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.user_metadata?.is_admin
                          ? "bg-orange/20 text-orange border border-orange/30"
                          : "bg-bg3 text-dim border border-line"
                      }`}>
                        {u.user_metadata?.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs text-orange hover:underline font-semibold"
                      >
                        View
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
