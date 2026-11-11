/**
 * scripts/verify-phase2-p1.ts
 *
 * Automated verification script for Phase 2 (P1: High-Priority Security & Broken Flows).
 *
 * Verifies:
 * 1. Migration 20261101000001_phase2_p1_security_lockdown.sql rules & policies
 * 2. DI container wiring for workspace invitations & system member repo
 * 3. MemberService privileged invitation acceptance
 * 4. Role hierarchy enforcement in app/actions/assets.ts (no bare isMember)
 * 5. Cryptographic Cloudflare Stream Webhook verification (HMAC + timestamp drift)
 * 6. AWS Silo Restore Webhook SSRF validation
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CloudflareStreamStorageProvider } from "../core/providers/storage/cloudflare-stream.provider";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runVerification() {
  console.log("=== PHASE 2 (P1) SECURITY & WORKFLOW VERIFICATION ===\n");

  // 1. Verify Migration File
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations-archive/20261101000001_phase2_p1_security_lockdown.sql"
  );
  assert(fs.existsSync(migrationPath), "Migration file 20261101000001 exists on disk");
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  // Check workspaces policies
  assert(
    migrationSql.includes('DROP POLICY IF EXISTS "Members can access their workspaces" ON "public"."workspaces"'),
    "Workspaces blanket FOR ALL policy dropped"
  );
  assert(
    migrationSql.includes('CREATE POLICY "Only owners can delete workspaces"') &&
    migrationSql.includes("USING (auth.uid() = owner_id)"),
    "Workspaces DELETE policy strictly restricted to owner"
  );
  assert(
    migrationSql.includes('CREATE POLICY "Admins and owners can update workspaces"') &&
    migrationSql.includes("is_workspace_admin(id, auth.uid())"),
    "Workspaces UPDATE policy restricted to admin or owner"
  );

  // Check clients policies
  assert(
    migrationSql.includes('CREATE POLICY "Workspace members can view clients"'),
    "Clients SELECT policy created for workspace members"
  );
  assert(
    migrationSql.includes('CREATE POLICY "Workspace admins can delete clients"'),
    "Clients DELETE policy restricted to workspace admins"
  );

  // Check notification_logs policies
  assert(
    migrationSql.includes('CREATE POLICY "Workspace members can view notification logs"'),
    "Notification logs SELECT policy created for workspace members"
  );
  assert(
    !migrationSql.includes('CREATE POLICY "Workspace members can delete notification logs"') &&
    !migrationSql.includes('DELETE\n  ON "public"."notification_logs"'),
    "Notification logs retain append-only posture (no DELETE policy)"
  );

  // Check workspace_invitations policy
  assert(
    migrationSql.includes('CREATE POLICY "Users can view pending invitations sent to their email"') &&
    migrationSql.includes("email = (auth.jwt() ->> 'email')"),
    "Workspace invitations email-scoped SELECT policy created"
  );

  // 2. Verify DI Container & MemberService Wiring
  const containerPath = path.resolve(process.cwd(), "core/container.ts");
  const containerCode = fs.readFileSync(containerPath, "utf-8");
  assert(
    containerCode.includes("new SupabaseWorkspaceInvitationRepository(systemClient)"),
    "workspaceInvitationRepo wired to systemClient in core/container.ts"
  );
  assert(
    containerCode.includes("new SupabaseWorkspaceMemberRepository(systemClient)"),
    "systemWorkspaceMemberRepo created with systemClient in core/container.ts"
  );

  const memberServicePath = path.resolve(process.cwd(), "core/services/member.service.ts");
  const memberServiceCode = fs.readFileSync(memberServicePath, "utf-8");
  assert(
    memberServiceCode.includes("this.systemMemberRepo || this.memberRepo"),
    "MemberService.acceptInvitation utilizes systemMemberRepo fallback"
  );

  // 3. Verify Role Hierarchy in Assets Server Actions
  const assetsActionPath = path.resolve(process.cwd(), "app/actions/assets.ts");
  const assetsActionCode = fs.readFileSync(assetsActionPath, "utf-8");
  assert(
    assetsActionCode.includes('import { requireWorkspaceMember } from "@/core/security/guards";'),
    "requireWorkspaceMember imported in app/actions/assets.ts"
  );
  assert(
    !assetsActionCode.includes("services.member.isMember"),
    "Zero bare services.member.isMember checks in app/actions/assets.ts"
  );
  assert(
    assetsActionCode.includes('requireWorkspaceMember(asset.workspaceId, "admin")'),
    "permanentDeleteAssetAction enforces admin role level"
  );
  assert(
    assetsActionCode.includes('requireWorkspaceMember(workspaceId, "admin")'),
    "emptyTrashAction enforces admin role level"
  );
  assert(
    assetsActionCode.includes('requireWorkspaceMember(asset.workspaceId, "editor")'),
    "deleteAssetAction enforces editor role level"
  );

  // 4. Verify Cryptographic Cloudflare Stream Webhook Verification
  const testSecret = "cf_secret_test_key_1234567890abcdef";
  const cfProvider = new CloudflareStreamStorageProvider({
    accountId: "test_account",
    apiToken: "test_token",
    webhookSecret: testSecret,
  });

  const testPayload = JSON.stringify({ uid: "video_123", status: { state: "ready" } });
  const currentEpoch = Math.floor(Date.now() / 1000);
  const validHmac = crypto
    .createHmac("sha256", testSecret)
    .update(`${currentEpoch}.${testPayload}`)
    .digest("hex");

  const validHeaders = {
    "webhook-signature": `time=${currentEpoch},sig1=${validHmac}`,
  };

  assert(
    cfProvider.verifyWebhookSignature(testPayload, validHeaders) === true,
    "Cloudflare Stream webhook accepts valid HMAC signature with current timestamp"
  );

  // Tampered payload
  assert(
    cfProvider.verifyWebhookSignature(testPayload + "tampered", validHeaders) === false,
    "Cloudflare Stream webhook rejects payload mismatch"
  );

  // Forged signature
  const forgedHeaders = {
    "webhook-signature": `time=${currentEpoch},sig1=0000000000000000000000000000000000000000000000000000000000000000`,
  };
  assert(
    cfProvider.verifyWebhookSignature(testPayload, forgedHeaders) === false,
    "Cloudflare Stream webhook rejects forged signature"
  );

  // Expired timestamp (replay attack simulation: 10 minutes ago)
  const oldEpoch = currentEpoch - 600;
  const oldHmac = crypto
    .createHmac("sha256", testSecret)
    .update(`${oldEpoch}.${testPayload}`)
    .digest("hex");
  const replayHeaders = {
    "webhook-signature": `time=${oldEpoch},sig1=${oldHmac}`,
  };
  assert(
    cfProvider.verifyWebhookSignature(testPayload, replayHeaders) === false,
    "Cloudflare Stream webhook rejects replay attack (timestamp drift > 300s)"
  );

  // 5. Verify AWS Silo Webhook SSRF Validation Logic
  const siloRoutePath = path.resolve(process.cwd(), "app/api/silo/restore-webhook/route.ts");
  const siloRouteCode = fs.readFileSync(siloRoutePath, "utf-8");
  assert(
    siloRouteCode.includes("/^sns\\.[a-z0-9-]+\\.amazonaws\\.com$/i.test(parsedUrl.hostname)"),
    "AWS Silo webhook validates hostname against AWS SNS regex"
  );
  assert(
    siloRouteCode.includes('parsedUrl.protocol !== "https:"'),
    "AWS Silo webhook requires https protocol for SubscribeURL"
  );

  // Test regex directly against attack vectors
  const awsSnsRegex = /^sns\.[a-z0-9-]+\.amazonaws\.com$/i;
  assert(awsSnsRegex.test("sns.us-east-1.amazonaws.com") === true, "AWS SNS regex accepts sns.us-east-1.amazonaws.com");
  assert(awsSnsRegex.test("sns.eu-west-1.amazonaws.com") === true, "AWS SNS regex accepts sns.eu-west-1.amazonaws.com");
  assert(awsSnsRegex.test("169.254.169.254") === false, "AWS SNS regex blocks AWS Metadata IP SSRF");
  assert(awsSnsRegex.test("localhost") === false, "AWS SNS regex blocks localhost SSRF");
  assert(awsSnsRegex.test("evil.com") === false, "AWS SNS regex blocks arbitrary attacker domain");
  assert(awsSnsRegex.test("sns.us-east-1.amazonaws.com.attacker.com") === false, "AWS SNS regex blocks subdomain hijacking attack");

  console.log("\n🎯 ALL PHASE 2 (P1) SECURITY CHECKS PASSED SUCCESSFULLY!\n");
}

runVerification().catch((err) => {
  console.error("Verification failed with exception:", err);
  process.exit(1);
});
