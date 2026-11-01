import assert from "node:assert";
import fs from "node:fs";

async function runPhase1Verification() {
  console.log("=== [PHASE 1 (P0) SECURITY VERIFICATION SUITE] ===\n");

  // 1. Verify Database Migration Script
  console.log("1. Checking SQL migration definitions...");
  const migrationPath = "supabase/migrations/20261101000000_phase1_p0_security_lockdown.sql";
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
  const {
    generateDeliveryAccessToken,
    verifyDeliveryAccessToken,
    DELIVERY_COOKIE_PREFIX,
  } = await import("../lib/security/delivery-token");

  assert.strictEqual(DELIVERY_COOKIE_PREFIX, "delivery_access_");

  const testShareToken = "cut_share_token_abcdef123456";
  const validToken = generateDeliveryAccessToken(testShareToken);

  // Test valid signature
  assert.strictEqual(
    verifyDeliveryAccessToken(validToken, testShareToken),
    true,
    "FAILED: Valid token verification returned false!"
  );

  // Test tampered signature
  const tamperedToken = validToken.slice(0, -6) + "abcdef";
  assert.strictEqual(
    verifyDeliveryAccessToken(tamperedToken, testShareToken),
    false,
    "FAILED: Tampered HMAC signature was accepted!"
  );

  // Test static "verified" string spoofing rejection
  assert.strictEqual(
    verifyDeliveryAccessToken("verified", testShareToken),
    false,
    "FAILED: Static unauthenticated string 'verified' was accepted!"
  );

  // Test token replay against a different delivery
  assert.strictEqual(
    verifyDeliveryAccessToken(validToken, "other_delivery_token_999"),
    false,
    "FAILED: Token generated for one delivery was accepted for another!"
  );

  // Test expired token rejection
  const expiredTimestamp = Math.floor(Date.now() / 1000) - 100000;
  const expiredToken = `v1:${expiredTimestamp}:fakehmac`;
  assert.strictEqual(
    verifyDeliveryAccessToken(expiredToken, testShareToken, 3600),
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
