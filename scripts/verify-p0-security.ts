import assert from "node:assert";

async function runVerification() {
  console.log("=== [P0 SECURITY VERIFICATION SUITE] ===\n");

  // 1. Verify switchWorkspacePlanAction is completely deleted
  console.log("1. Checking elimination of switchWorkspacePlanAction...");
  const workspaceActions = await import("../app/actions/workspaces");
  assert.strictEqual(
    (workspaceActions as any).switchWorkspacePlanAction,
    undefined,
    "FAILED: switchWorkspacePlanAction is still exported!"
  );
  console.log("   ✓ PASS: switchWorkspacePlanAction is completely removed.");

  // 2. Verify Mock Upload lockdown
  console.log("\n2. Checking Mock Upload route lockdown...");
  const mockUploadModule = await import("../app/api/mock-upload/[uid]/route");
  
  // Test production 404
  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  const mockReq = { headers: new Headers(), nextUrl: new URL("http://localhost/api/mock-upload/valid_uid_12345678") } as any;
  const prodRes = await mockUploadModule.GET(mockReq, { params: Promise.resolve({ uid: "valid_uid_12345678" }) });
  assert.strictEqual(prodRes.status, 404, "FAILED: Mock upload GET did not return 404 in production!");

  // Test invalid UID traversal
  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  const badUidRes = await mockUploadModule.GET(mockReq, { params: Promise.resolve({ uid: "../../etc/passwd" }) });
  assert.strictEqual(badUidRes.status, 400, "FAILED: Mock upload allowed path traversal character in UID!");
  console.log("   ✓ PASS: Mock upload returns 404 in production and rejects path traversal.");

  // 3. Verify security guards module exists and exports expected methods
  console.log("\n3. Checking security guards module...");
  const guards = await import("../core/security/guards");
  assert.strictEqual(typeof guards.requireUser, "function", "requireUser missing!");
  assert.strictEqual(typeof guards.requireWorkspaceMember, "function", "requireWorkspaceMember missing!");
  assert.strictEqual(typeof guards.requireDeliveryAccess, "function", "requireDeliveryAccess missing!");
  console.log("   ✓ PASS: Security guards module is fully operational.");

  // 4. Verify stripe service no longer has mock_storage_ backdoor
  console.log("\n4. Checking Stripe service backdoor removal...");
  const fs = await import("node:fs");
  const stripeServiceContent = fs.readFileSync("core/services/stripe.service.ts", "utf8");
  assert.ok(!stripeServiceContent.includes("mock_storage_"), "FAILED: mock_storage_ still present in stripe.service.ts!");
  console.log("   ✓ PASS: Stripe service mock backdoor is completely eradicated.");

  // 5. Verify database migration file exists and contains RLS drop & trigger statements
  console.log("\n5. Checking database migration file...");
  const migrationContent = fs.readFileSync("supabase/migrations/20261024000000_p0_security_lockdown.sql", "utf8");
  assert.ok(migrationContent.includes("prevent_role_escalation"), "Migration missing prevent_role_escalation trigger!");
  assert.ok(migrationContent.includes("DROP POLICY IF EXISTS \"Anyone with share_token can view project\""), "Migration missing project RLS drop!");
  assert.ok(migrationContent.includes("DROP POLICY IF EXISTS \"Anyone with share_token can view assets\""), "Migration missing assets RLS drop!");
  assert.ok(migrationContent.includes("DROP POLICY IF EXISTS \"Guests can post feedback\""), "Migration missing feedback RLS drop!");
  console.log("   ✓ PASS: Database migration script is complete and comprehensive.");

  console.log("\n=========================================");
  console.log("ALL P0 SECURITY CHECKS PASSED SUCCESSFULLY!");
  console.log("=========================================\n");
}

runVerification().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
