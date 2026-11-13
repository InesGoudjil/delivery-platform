/**
 * Static guard: every Next.js server action must perform an authorization step,
 * or be allowlisted below with a one-line reason.
 *
 * The analyzer (./server-actions-analyzer.ts) reads every "use server" module under
 * app/actions/ with the TypeScript compiler API and works out, for each exported
 * action, whether calling it reaches:
 *   authn  a signed-in check: requireUser(), createAuthUserAction(), or an inline
 *          services.auth.getCurrentUser() call;
 *   authz  a check against the resource: requireWorkspaceMember / requireDeliveryAccess /
 *          requirePlatformAdmin, the createAuthWorkspace/DeliveryAction wrappers, the
 *          client-room gate (requireClientRoom in core/security/client-room.ts) or the
 *          passcode check (verifyDeliveryPasscode), or an inline isMember()/getMember() call or
 *          `.platformRole` comparison (the older admin.ts actions count as guarded);
 *   rateLimit  checkRateLimit() / assertRateLimit().
 * Helpers and delegations (same file, helper modules, other actions) are followed.
 *
 * The rules:
 *   1. Every action reaches authn or authz, or is in PUBLIC_ACTIONS or KNOWN_GAPS.
 *   2. An action that only reaches authn (signed in, but nothing ties the caller to the
 *      workspace or delivery it touches) is in USER_SCOPED_ACTIONS or KNOWN_AUTHZ_GAPS.
 *   3. The lists stay true: KNOWN_GAPS / KNOWN_AUTHZ_GAPS entries are removed once fixed
 *      (they only shrink), entries must name an existing action, and each PUBLIC_ACTIONS
 *      entry states correctly whether the action is rate limited.
 *
 * Adding an action? Call a guard. If it really must work without a session, add it to
 * PUBLIC_ACTIONS with the reason; never add new entries to the KNOWN_* lists.
 * Keys are "<file>#<exported name>". A new guard helper outside app/actions/ must be
 * registered in PRIMITIVES in the analyzer.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  analyzeServerActions,
  checkAuthPolicy,
  createFsHost,
  createOverlayHost,
  findMissingPrimitives,
  findStrayServerDirectives,
  type Analysis,
  type AuthPolicy,
  type PolicyViolations,
  type PublicActionEntry,
} from "./server-actions-analyzer";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** Callable without a session on purpose. */
const PUBLIC_ACTIONS: Record<string, PublicActionEntry> = {
  "app/actions/auth.ts#loginAction": {
    rateLimited: false,
    reason: "sign-in form. Not rate limited: RATELIMIT_POLICIES.authLogin is defined but never applied",
  },
  "app/actions/auth.ts#signupAction": {
    rateLimited: false,
    reason: "sign-up form. Not rate limited: RATELIMIT_POLICIES.authSignup is defined but never applied",
  },
  "app/actions/auth.ts#requestPasswordResetAction": {
    rateLimited: false,
    reason: "forgot-password form (Supabase sends the mail). Not rate limited: RATELIMIT_POLICIES.passwordReset is unused",
  },
  "app/actions/auth.ts#signOutAction": {
    rateLimited: false,
    reason: "ends the caller's own session; a no-op without one",
  },
  "app/actions/waitlist.ts#joinWaitlistAction": {
    rateLimited: true,
    reason: "public waitlist sign-up (honeypot + waitlistJoin rate limit)",
  },
  "app/actions/waitlist.ts#checkWaitlistStatusAction": {
    rateLimited: false,
    reason: "public 'check my position' lookup. Not rate limited, and it confirms whether any email is on the waitlist",
  },
  "app/actions/inquiries.ts#submitPortfolioInquiryAction": {
    rateLimited: false,
    reason: "lead form on public portfolio pages. Not rate limited: every call emails the filmmaker",
  },
  "app/actions/inquiries.ts#submitContactFormAction": {
    rateLimited: false,
    reason: "public /contact form. Not rate limited: every call emails the team",
  },
  "app/actions/inquiries.ts#submitPartnershipAction": {
    rateLimited: false,
    reason: "public partnership application form. Not rate limited: every call emails the team",
  },
};

/** No auth step today, but they need one. Ratchet: remove entries as they are fixed, never add. */
const KNOWN_GAPS: Record<string, string> = {};

/** Signed-in check only, and that is enough: they act on the caller's own account or data. */
const USER_SCOPED_ACTIONS: Record<string, string> = {
  "app/actions/auth.ts#resetPasswordAction": "sets the caller's own password; Supabase rejects it without a recovery session",
  "app/actions/auth.ts#changePasswordAction": "changes the caller's own password after re-checking the current one",
  "app/actions/members.ts#acceptWorkspaceInvitationAction":
    "the invitation token plus the caller's confirmed email matching the invited one; it adds the caller to the inviting workspace",
  "app/actions/projects.ts#createProjectAction": "creates a delivery in the caller's own workspace (getOrCreateWorkspace(user.id))",
  "app/actions/sessions.ts#getActiveSessionsAction": "lists the caller's own sessions",
  "app/actions/sessions.ts#revokeSessionAction": "revokes one of the caller's own sessions (the query filters on user_id)",
  "app/actions/sessions.ts#revokeAllOtherSessionsAction": "signs the caller out of their other sessions",
  "app/actions/workspaces.ts#checkTeamWorkspaceEligibilityAction": "reads the caller's own plan eligibility",
  "app/actions/workspaces.ts#createTeamWorkspaceAction": "creates a new workspace owned by the caller",
};

/** Signed-in check only, but they touch someone's workspace or delivery. Ratchet, like KNOWN_GAPS. */
const KNOWN_AUTHZ_GAPS: Record<string, string> = {};

/**
 * Use the service role (row-level security off) without the client-room gate or a
 * lib/client-room/scope.ts loader. Each reason says what ties the ids it writes to a
 * resource the caller is authorized for. A new entry needs the same review.
 */
const SERVICE_ROLE_ACTIONS: Record<string, string> = {
  "app/actions/admin.ts#createPlanAction": "platform admins only (platformRole check); plans aren't tenant data",
  "app/actions/admin.ts#updatePlanAction": "platform admins only (platformRole check); plans aren't tenant data",
  "app/actions/admin.ts#deletePlanAction": "platform admins only (platformRole check); plans aren't tenant data",
  "app/actions/admin.ts#updateWorkspacePlanAction":
    "platform admins only (platformRole check); staff choose the workspace on purpose",
  "app/actions/inquiries.ts#submitPortfolioInquiryAction":
    "public form; the studio is resolved server-side from a published portfolio's slug, and it only inserts an inquiry",
  "app/actions/inquiries.ts#submitContactFormAction": "public form; inserts an inquiry with no workspace id",
  "app/actions/inquiries.ts#submitPartnershipAction": "public form; inserts an inquiry with no workspace id",
  "app/actions/silo.ts#checkDeliverySiloStatusAction":
    "requireDeliveryAccess(deliveryId, 'viewer') first; the finalize step acts on that delivery only",
  "app/actions/deliveries/create-delivery.ts#createDeliveryAction":
    "editor of the workspace (requireWorkspaceMember 'editor'); the service role only sends the plan-limit email to the caller's own address, rate limited to once a day per workspace, and logs it",
  "app/actions/upload.ts#requestAssetUploadAction":
    "editor of the workspace; the server creates the rows and keys itself, and the asset/delivery are checked against the workspace",
  "app/actions/upload.ts#requestVideoUploadAction": "delegates to requestAssetUploadAction",
  "app/actions/upload.ts#confirmUploadCompletedAction":
    "editor of the version's own workspace; it only finalizes the row and key the server issued at presign",
  "app/actions/assets/update-asset.ts#updateAssetAction":
    "editor of the asset's workspace; the service role writes only the thumbnail: an image in that workspace, a frame of the file's own Stream video, or a crop stored under the file's own prefix",
  "app/actions/deliveries/delegates.ts#updateAssetAction": "re-export of assets/update-asset.ts#updateAssetAction",
  "app/actions/portfolio.ts#updateAssetAction": "re-export of assets/update-asset.ts#updateAssetAction",
  "app/actions/whatsapp.ts#startWhatsAppVerificationAction":
    "admin of the workspace (requireWorkspaceMember 'admin'); writes only that workspace's pending number and code hash",
  "app/actions/whatsapp.ts#confirmWhatsAppVerificationAction":
    "admin of the workspace; the code is checked against that workspace's own pending number before it's saved",
  "app/actions/whatsapp.ts#removeWhatsAppNumberAction": "admin of the workspace; clears only that workspace's number",
  "app/actions/deliveries/whatsapp.ts#sendDeliveryWhatsAppAction":
    "requireDeliveryAccess(deliveryId, 'editor') first; sends that delivery's own link, and the consent is written through the member's session",
};

const POLICY: AuthPolicy = {
  publicActions: PUBLIC_ACTIONS,
  knownGaps: KNOWN_GAPS,
  userScopedActions: USER_SCOPED_ACTIONS,
  knownAuthzGaps: KNOWN_AUTHZ_GAPS,
  serviceRoleActions: SERVICE_ROLE_ACTIONS,
};

describe("server actions: every action performs an authorization step", () => {
  let analysis: Analysis;
  let violations: PolicyViolations;

  beforeAll(() => {
    analysis = analyzeServerActions({ host: createFsHost(ROOT) });
    violations = checkAuthPolicy(analysis.actions, POLICY);
  });

  it("finds the server actions and understands every export", () => {
    expect(analysis.serverFiles.length).toBeGreaterThan(0);
    expect(analysis.actions.length).toBeGreaterThan(0);
    expect(analysis.problems).toEqual([]);
  });

  it("finds every auth primitive where the analyzer expects it", () => {
    expect(findMissingPrimitives(createFsHost(ROOT))).toEqual([]);
  });

  it("has no server actions outside app/actions/", () => {
    expect(findStrayServerDirectives({ host: createFsHost(ROOT) })).toEqual([]);
  });

  it("guards every action, unless it is allowlisted as public or a known gap", () => {
    expect(violations.unguarded).toEqual([]);
  });

  it("ties every signed-in action to the resource it touches, unless it is user-scoped or a known gap", () => {
    expect(violations.authenticatedOnly).toEqual([]);
  });

  it("keeps the allowlists in sync with the code, so the known-gap lists only shrink", () => {
    expect(violations.staleEntries).toEqual([]);
    expect(violations.listErrors).toEqual([]);
  });

  it("records correctly which public actions are rate limited", () => {
    expect(violations.rateLimit).toEqual([]);
  });

  it("ties every service-role write to an authorized resource, or lists why it's safe", () => {
    expect(violations.unscopedServiceRole).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Self-test: the analyzer and policy on small in-memory modules. The fixtures import
// the real guards, so this also checks import resolution against the repo.
// ---------------------------------------------------------------------------

const FIXTURE_DIR = "__auth_guard_fixtures__/actions";
const SAMPLE = `${FIXTURE_DIR}/sample.ts`;
const OTHER = `${FIXTURE_DIR}/other.ts`;

const FIXTURES: Record<string, string> = {
  [`${FIXTURE_DIR}/workspace-helper.ts`]: [
    'import { requireWorkspaceMember } from "@/core/security/guards";',
    "export async function loadWorkspaceForEditor(workspaceId: string) {",
    '  return requireWorkspaceMember(workspaceId, "editor");',
    "}",
  ].join("\n"),
  [OTHER]: [
    '"use server";',
    'import { requireDeliveryAccess } from "@/core/security/guards";',
    "export async function otherGuardedAction(deliveryId: string) {",
    "  await requireDeliveryAccess(deliveryId);",
    "}",
    "export async function otherOpenAction() {",
    "  return 1;",
    "}",
  ].join("\n"),
  [`${FIXTURE_DIR}/not-actions.ts`]: "export async function notAnAction() {\n  return 1;\n}",
  [SAMPLE]: [
    '"use server";',
    'import { requireUser } from "@/core/security/guards";',
    'import { createAuthWorkspaceAction } from "@/app/actions/safe-action";',
    'import { checkRateLimit, RATELIMIT_POLICIES } from "@/lib/upstash";',
    'import { loadWorkspaceForEditor } from "./workspace-helper";',
    'import { otherGuardedAction as forwardTarget, otherOpenAction } from "./other";',
    "",
    "export interface OnlyAType { id: string }",
    "",
    "export async function openAction(id: string) {",
    "  return { id };",
    "}",
    "",
    "export async function signedInAction() {",
    "  const { user } = await requireUser();",
    "  return user.id;",
    "}",
    "",
    "async function localHelper(workspaceId: string) {",
    "  return loadWorkspaceForEditor(workspaceId);",
    "}",
    "",
    "export const viaHelperAction = async (workspaceId: string) => {",
    "  await localHelper(workspaceId);",
    "};",
    "",
    "export async function forwardingAction(deliveryId: string) {",
    "  return forwardTarget(deliveryId);",
    "}",
    "",
    "export async function forwardsToOpenAction() {",
    "  return otherOpenAction();",
    "}",
    "",
    "export const wrappedAction = createAuthWorkspaceAction(schema, (input) => input.workspaceId, async () => null);",
    "",
    "async function requireDeliveryAccess() {",
    "  return true;",
    "}",
    "export async function lookalikeGuardAction() {",
    "  await requireDeliveryAccess();",
    "}",
    "",
    "async function ping(): Promise<void> {",
    "  await pong();",
    "}",
    "async function pong(): Promise<void> {",
    "  await ping();",
    "}",
    "export async function cyclicAction() {",
    "  await ping();",
    "}",
    "",
    "export async function inlineAdminAction(services: any) {",
    "  const user = await services.auth.getCurrentUser();",
    "  const profile = await services.profile.getProfile(user.id);",
    '  if (profile?.platformRole !== "admin") throw new Error("Forbidden");',
    "}",
    "",
    "export async function signedInOnlyAction(services: any, deliveryId: string) {",
    "  const user = await services.auth.getCurrentUser();",
    "  if (!user) throw new Error('Unauthorized');",
    "  return services.delivery.getDeliveryById(deliveryId);",
    "}",
    "",
    "export async function rateLimitedOpenAction() {",
    "  await checkRateLimit({ policy: RATELIMIT_POLICIES.waitlistJoin });",
    "}",
    "",
    "async function aliasTarget() {",
    "  await requireUser();",
    "}",
    "export { aliasTarget as aliasedAction };",
  ].join("\n"),
};

const id = (name: string, file = SAMPLE) => `${file}#${name}`;
const EMPTY_POLICY: AuthPolicy = { publicActions: {}, knownGaps: {}, userScopedActions: {}, knownAuthzGaps: {} };

describe("server action analyzer (self-test)", () => {
  let fixture: Analysis;
  const capabilitiesOf = (actionId: string) => {
    const action = fixture.actions.find((a) => a.id === actionId);
    if (!action) throw new Error(`fixture action ${actionId} not found`);
    return [...action.capabilities].sort();
  };

  beforeAll(() => {
    fixture = analyzeServerActions({ host: createOverlayHost(ROOT, FIXTURES), actionsDir: FIXTURE_DIR });
  });

  it("collects exported functions of 'use server' modules only, skipping types", () => {
    expect(fixture.problems).toEqual([]);
    expect(fixture.serverFiles.sort()).toEqual([OTHER, SAMPLE]);
    expect(fixture.actions.map((a) => a.id).sort()).toEqual(
      [
        id("otherGuardedAction", OTHER),
        id("otherOpenAction", OTHER),
        id("openAction"),
        id("signedInAction"),
        id("viaHelperAction"),
        id("forwardingAction"),
        id("forwardsToOpenAction"),
        id("wrappedAction"),
        id("lookalikeGuardAction"),
        id("cyclicAction"),
        id("inlineAdminAction"),
        id("signedInOnlyAction"),
        id("rateLimitedOpenAction"),
        id("aliasedAction"),
      ].sort()
    );
  });

  it("flags an exported action with no auth step", () => {
    expect(capabilitiesOf(id("openAction"))).toEqual([]);
    const { unguarded } = checkAuthPolicy(fixture.actions, EMPTY_POLICY);
    expect(unguarded.some((message) => message.startsWith(`${SAMPLE}:10 openAction has no authorization step`))).toBe(true);
  });

  it("passes an action that calls requireUser()", () => {
    expect(capabilitiesOf(id("signedInAction"))).toEqual(["authn"]);
  });

  it("passes an action that delegates to a guarded helper, across files", () => {
    expect(capabilitiesOf(id("viaHelperAction"))).toEqual(["authz"]);
    expect(fixture.actions.find((a) => a.id === id("viaHelperAction"))?.evidence.authz).toBe(
      `${SAMPLE}#localHelper → ${FIXTURE_DIR}/workspace-helper.ts#loadWorkspaceForEditor → requireWorkspaceMember()`
    );
  });

  it("inherits the status of an imported action it forwards to", () => {
    expect(capabilitiesOf(id("forwardingAction"))).toEqual(["authz"]);
    expect(capabilitiesOf(id("forwardsToOpenAction"))).toEqual([]);
    expect(capabilitiesOf(id("aliasedAction"))).toEqual(["authn"]);
  });

  it("counts the createAuth*Action wrappers", () => {
    expect(capabilitiesOf(id("wrappedAction"))).toEqual(["authz"]);
  });

  it("is not fooled by a local function named like a guard, and terminates on cycles", () => {
    expect(capabilitiesOf(id("lookalikeGuardAction"))).toEqual([]);
    expect(capabilitiesOf(id("cyclicAction"))).toEqual([]);
  });

  it("counts inline getCurrentUser() as signed-in and a .platformRole comparison as authorized", () => {
    expect(capabilitiesOf(id("inlineAdminAction"))).toEqual(["authn", "authz"]);
    expect(capabilitiesOf(id("signedInOnlyAction"))).toEqual(["authn"]);
    const { authenticatedOnly } = checkAuthPolicy(fixture.actions, EMPTY_POLICY);
    expect(authenticatedOnly.map((message) => message.split(" ")[1]).sort()).toEqual(
      ["aliasedAction", "signedInAction", "signedInOnlyAction"].sort()
    );
  });

  it("does not treat a rate limit as authorization", () => {
    expect(capabilitiesOf(id("rateLimitedOpenAction"))).toEqual(["rateLimit"]);
    const { unguarded } = checkAuthPolicy(fixture.actions, EMPTY_POLICY);
    expect(unguarded.some((message) => message.includes(" rateLimitedOpenAction "))).toBe(true);
  });

  it("requires service-role actions to scope the ids they write, or to be reviewed", () => {
    const dir = "__service_role_fixtures__/actions";
    const analysis = analyzeServerActions({
      host: createOverlayHost(ROOT, {
        [`${dir}/room.ts`]: [
          '"use server";',
          'import { getServerAdminServices } from "@/core/server";',
          'import { requireDeliveryAccess } from "@/core/security/guards";',
          'import { versionInDelivery } from "@/lib/client-room/scope";',
          "export async function scopedWrite(deliveryId: string, versionId: string) {",
          "  const { delivery } = await requireDeliveryAccess(deliveryId);",
          "  const admin = await getServerAdminServices();",
          "  await versionInDelivery(admin as any, delivery, versionId);",
          "}",
          "export async function rawWrite(deliveryId: string, versionId: string) {",
          "  await requireDeliveryAccess(deliveryId);",
          "  const admin = await getServerAdminServices();",
          "  return admin.asset.getVersionById(versionId);",
          "}",
        ].join("\n"),
      }),
      actionsDir: dir,
    });
    const at = (name: string) => `${dir}/room.ts#${name}`;

    const unreviewed = checkAuthPolicy(analysis.actions, EMPTY_POLICY);
    expect(unreviewed.unscopedServiceRole).toHaveLength(1);
    expect(unreviewed.unscopedServiceRole[0]).toContain("rawWrite uses the service role");

    const reviewed = checkAuthPolicy(analysis.actions, {
      ...EMPTY_POLICY,
      serviceRoleActions: { [at("rawWrite")]: "reviewed", [at("scopedWrite")]: "not needed" },
    });
    expect(reviewed.unscopedServiceRole).toEqual([]);
    expect(reviewed.staleEntries).toEqual([
      `SERVICE_ROLE_ACTIONS["${at("scopedWrite")}"] is scoped now (versionInDelivery()); remove the entry.`,
    ]);
  });

  it("enforces the ratchet: fixed gaps, missing names and wrong flags all fail", () => {
    const violations = checkAuthPolicy(fixture.actions, {
      publicActions: {
        [id("openAction")]: { reason: "public on purpose", rateLimited: true },
        [id("deletedAction")]: { reason: "was removed", rateLimited: false },
      },
      knownGaps: {
        [id("forwardsToOpenAction")]: "still open",
        [id("signedInAction")]: "fixed since",
      },
      userScopedActions: { [id("viaHelperAction")]: "checks a workspace, so it is not user-scoped" },
      knownAuthzGaps: { [id("signedInOnlyAction")]: "" },
    });
    expect(violations.unguarded.some((m) => m.includes(" openAction ") || m.includes(" forwardsToOpenAction "))).toBe(false);
    expect(violations.staleEntries).toEqual([
      `PUBLIC_ACTIONS["${id("deletedAction")}"] does not match any server action (renamed, moved or deleted?); update or remove the entry.`,
      `KNOWN_GAPS["${id("signedInAction")}"] is guarded now (requireUser()); remove the entry.`,
      `USER_SCOPED_ACTIONS["${id("viaHelperAction")}"] performs a resource check now (${
        fixture.actions.find((a) => a.id === id("viaHelperAction"))?.evidence.authz
      }); remove the entry.`,
    ]);
    expect(violations.rateLimit).toEqual([
      `PUBLIC_ACTIONS["${id("openAction")}"] says rateLimited: true, but the analyzer finds no checkRateLimit/assertRateLimit call; update the entry.`,
    ]);
    expect(violations.listErrors).toEqual([`KNOWN_AUTHZ_GAPS["${id("signedInOnlyAction")}"] needs a one-line reason.`]);
  });

  it("reports exports it cannot classify", () => {
    const analysis = analyzeServerActions({
      host: createOverlayHost(ROOT, {
        [`${FIXTURE_DIR}/bad.ts`]: [
          '"use server";',
          "export const LIMIT = 10;",
          'export * from "./helpers";',
        ].join("\n"),
        [`${FIXTURE_DIR}/helpers.ts`]: "export async function helper() {}",
      }),
      actionsDir: FIXTURE_DIR,
    });
    expect(analysis.problems).toEqual([
      `${FIXTURE_DIR}/bad.ts:2 exports \`LIMIT\`, which is not a function; a "use server" file may only export async functions.`,
      `${FIXTURE_DIR}/bad.ts:3 \`export * from "./helpers"\` turns every export of that module into a server action; export the functions explicitly.`,
    ]);
  });

  it("flags server actions declared outside the actions directory", () => {
    const findings = findStrayServerDirectives({
      host: createOverlayHost(ROOT, {
        [`${FIXTURE_DIR}/fine.ts`]: '"use server";\nexport async function fine() {}',
        "__auth_guard_fixtures__/lib/stray.ts": "'use server';\nexport async function stray() {}",
        "__auth_guard_fixtures__/components/form.tsx": [
          "export function Form() {",
          "  async function save() {",
          '    "use server";',
          "  }",
          "  return <form action={save} />;",
          "}",
        ].join("\n"),
      }),
      actionsDir: FIXTURE_DIR,
    });
    expect(findings).toEqual([
      `__auth_guard_fixtures__/components/form.tsx:2: inline "use server" function; move it into ${FIXTURE_DIR}/ so the auth guard covers it.`,
      `__auth_guard_fixtures__/lib/stray.ts: "use server" module outside ${FIXTURE_DIR}/; move it there so the auth guard covers it.`,
    ]);
  });
});
