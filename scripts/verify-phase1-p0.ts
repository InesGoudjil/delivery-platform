import assert from "node:assert";
import fs from "node:fs";

async function runPhase1Verification() {
  console.log("=== [PHASE 1 (P0) SECURITY VERIFICATION SUITE] ===\n");

  // 1. Verify Database Migration Script
  console.log("1. Checking SQL migration definitions...");
  const migrationPath = "supabase/migrations-archive/20261101000000_phase1_p0_security_lockdown.sql";
  assert.ok(fs.existsSync(migrationPath), "Migration file does not exist!");
  const migrationContent = fs.readFileSync(migrationPath, "utf8");
  
  assert.ok(
    migrationContent.includes('DROP POLICY IF EXISTS "Workspace owners can manage subscriptions"'),
    "FAILED: Missing subscriptions policy drop!"
  );
  assert.ok(
    migrationContent.includes('DROP POLICY IF EXISTS "Workspace owners can manage invoices"'),
    "FAILED: Missing invoices policy drop!"
  );
  assert.ok(
    migrationContent.includes('DROP POLICY IF EXISTS "Allow reading waitlist entry"'),
    "FAILED: Missing waitlist public read drop!"
  );
  assert.ok(
    migrationContent.includes('CREATE POLICY "Workspace members can view subscriptions"'),
    "FAILED: Missing read-only subscriptions policy for members!"
  );
  assert.ok(
    migrationContent.includes('CREATE POLICY "Platform admins can view waitlist entries"'),
    "FAILED: Missing restricted admin waitlist read policy!"
  );
  console.log("   ✓ PASS: Database migration locks down subscriptions, invoices, and waitlist_entries.");

  // 2. Verify Delivery Passcode HMAC Signing Module
  console.log("\n2. Checking cryptographic delivery passcode HMAC module...");
  const { createRoomAccessToken, verifyRoomAccessToken, roomAccessCookieName } = await import(
    "../lib/security/delivery-token"
  );

  const subject = {
    id: "00000000-0000-4000-8000-000000000001",
    shareToken: "cut_share_token_abcdef123456",
    passcodeHash: "scrypt$hash",
  };
  assert.ok(roomAccessCookieName(subject.shareToken).startsWith("room_"));
  assert.ok(!roomAccessCookieName(subject.shareToken).includes(subject.shareToken), "FAILED: cookie name leaks the share token!");

  const validToken = createRoomAccessToken(subject);
  assert.strictEqual(verifyRoomAccessToken(validToken, subject), true, "FAILED: Valid token verification returned false!");
  assert.strictEqual(
    verifyRoomAccessToken(validToken.slice(0, -6) + "abcdef", subject),
    false,
    "FAILED: Tampered HMAC signature was accepted!"
  );
  assert.strictEqual(verifyRoomAccessToken("verified", subject), false, "FAILED: Static string 'verified' was accepted!");
  assert.strictEqual(
    verifyRoomAccessToken(validToken, { ...subject, shareToken: "other_delivery_token_999" }),
    false,
    "FAILED: Token generated for one delivery was accepted for another!"
  );
  assert.strictEqual(
    verifyRoomAccessToken(validToken, { ...subject, passcodeHash: "scrypt$new" }),
    false,
    "FAILED: Token survived a passcode change!"
  );
  assert.strictEqual(
    verifyRoomAccessToken(createRoomAccessToken(subject, 1), subject, Date.now() + 5000),
    false,
    "FAILED: Expired token was accepted!"
  );
  console.log("   ✓ PASS: HMAC delivery passcode security is tamper-proof and rejects forged cookies.");

  // 3. Verify Static "verified" Cookie Elimination Across Codebase
  console.log("\n3. Checking complete eradication of static '=== \"verified\"' checks...");
  const deliveriesSource = fs.readFileSync("app/actions/deliveries.ts", "utf8");
  const deliverPageSource = fs.readFileSync("app/(public)/deliver/[shareToken]/page.tsx", "utf8");
  const mediaRouteSource = fs.readFileSync("app/api/media/[...path]/route.ts", "utf8");
  const feedbackSource = fs.readFileSync("app/actions/feedback.ts", "utf8");

  assert.ok(
    !deliveriesSource.includes('=== "verified"'),
    "FAILED: app/actions/deliveries.ts still contains '=== \"verified\"' check!"
  );
  assert.ok(
    !deliverPageSource.includes('=== "verified"'),
    "FAILED: app/(public)/deliver/[shareToken]/page.tsx still contains '=== \"verified\"' check!"
  );
  assert.ok(
    !mediaRouteSource.includes('=== "verified"'),
    "FAILED: app/api/media/[...path]/route.ts still contains '=== \"verified\"' check!"
  );
  assert.ok(
    !feedbackSource.includes('=== "verified"'),
    "FAILED: app/actions/feedback.ts still contains '=== \"verified\"' check!"
  );
  console.log("   ✓ PASS: All delivery authorization points use cryptographic token verification.");

  // 4. Verify BOLA Fix in deletePortfolioItemAction
  console.log("\n4. Checking BOLA remediation in deletePortfolioItemAction...");
  const assetsSource = fs.readFileSync("app/actions/assets.ts", "utf8");
  const fallbackIndex = assetsSource.indexOf("const delivery = await services.delivery.getDeliveryById");
  assert.ok(fallbackIndex !== -1, "FAILED: Delivery fallback not found in assets.ts");

  const snippet = assetsSource.slice(fallbackIndex, fallbackIndex + 450);
  assert.ok(
    snippet.includes("requireWorkspaceMember") || snippet.includes("isMember"),
    "FAILED: Delivery fallback deletes delivery without validating workspace membership!"
  );
  console.log("   ✓ PASS: deletePortfolioItemAction validates workspace membership on deliveries.");

  console.log("\n=========================================");
  console.log("ALL PHASE 1 (P0) SECURITY CHECKS PASSED!");
  console.log("=========================================\n");
}

runPhase1Verification().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
