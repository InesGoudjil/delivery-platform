#!/usr/bin/env node
/**
 * Probes a Supabase project with its public anon key, the way anyone on the internet can.
 * After the Phase 1 migrations, the anon key must reach nothing: no table, view or RPC.
 *
 *   SUPABASE_URL=https://<project>.supabase.co SUPABASE_ANON_KEY=<anon key> node scripts/probe-anon-access.mjs
 *
 * Run it against staging (and production after a rollout). It only reads, and only with
 * the anon key. Exit code 1 if anything answered with data or accepted a write.
 */

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!url || !anonKey) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  process.exit(2);
}

const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: "application/json" };

const TABLES = [
  "asset_versions", "assets", "clients", "deliveries", "feedback", "feedback_replies", "inquiries",
  "invoices", "notification_logs", "plans", "portfolios", "processed_billing_events", "project_assets",
  "projects", "subscriptions", "user_profiles", "user_sessions", "waitlist_entries", "workspace_features",
  "workspace_invitations", "workspace_members", "workspace_settings", "workspaces",
  "view_workspace_deliveries_summary", "view_workspace_storage_breakdown",
];
const RPCS = {
  is_workspace_member: { ws_id: "00000000-0000-4000-8000-000000000000", u_id: "00000000-0000-4000-8000-000000000000" },
  is_platform_admin: { u_id: "00000000-0000-4000-8000-000000000000" },
  has_workspace_role: { ws_id: "00000000-0000-4000-8000-000000000000", min_role: "viewer" },
  get_waitlist_position: { p_entry_id: "00000000-0000-4000-8000-000000000000" },
  recalculate_workspace_storage: { ws_id: "00000000-0000-4000-8000-000000000000" },
};

const refused = (status) => status === 401 || status === 403 || status === 404;
let failures = 0;

async function check(label, response) {
  const body = await response.text();
  // Even an empty 200 fails: it means the key still has the privilege and only RLS stopped it.
  const ok = refused(response.status);
  console.log(`${ok ? "ok  " : "FAIL"} ${label} → ${response.status} ${body.slice(0, 120).replace(/\s+/g, " ")}`);
  if (!ok) failures++;
}

// 1. The schema PostgREST exposes to this key: should list no tables or functions.
const root = await fetch(`${url}/rest/v1/`, { headers });
const spec = await root.json().catch(() => ({}));
const exposed = Object.keys(spec?.paths ?? {}).filter((p) => p !== "/");
console.log(`${exposed.length === 0 ? "ok  " : "FAIL"} OpenAPI exposes ${exposed.length} paths${exposed.length ? `: ${exposed.join(", ")}` : ""}`);
if (exposed.length) failures++;

// 2. Reads on every table and view.
for (const table of TABLES) {
  await check(`select ${table}`, await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers }));
}

// 3. The public forms' tables refuse direct inserts (the server writes them).
for (const [table, row] of [
  ["waitlist_entries", { email: `probe-${Date.now()}@example.invalid`, referral_code: `PROBE${Date.now()}` }],
  ["inquiries", { type: "contact_message", name: "probe", email: "probe@example.invalid", message: "probe" }],
]) {
  await check(
    `insert ${table}`,
    await fetch(`${url}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    })
  );
}

// 4. RPCs.
for (const [fn, args] of Object.entries(RPCS)) {
  await check(
    `rpc ${fn}`,
    await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    })
  );
}

console.log(failures === 0 ? "\nThe anon key reaches nothing." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
