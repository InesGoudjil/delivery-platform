import { z } from "zod";
import { headers } from "next/headers";
import { formatZodError, safeValidate } from "@/lib/validations";
import { createScopedLogger } from "@/lib/logger";
import { getPlatformAdminServices, type PlatformAdminContext } from "@/core/admin/context";
import type { AdminAuditChanges } from "@/core/admin/types";
import { checkRateLimit, getClientIp } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import {
  requireUser,
  requireWorkspaceMember,
  requireDeliveryAccess,
  type AuthContext,
  type WorkspaceAuthContext,
  type DeliveryAuthContext,
  type WorkspaceRoleLevel,
} from "@/core/security/guards";

const defaultLog = createScopedLogger({ actionGroup: "safe-action" });

/**
 * Normalizes any thrown error into a clean user-facing string.
 */
export function normalizeActionError(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

/**
 * Base action wrapper: validates input schema, catches errors, and logs them.
 */
export function createSafeAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: (input: TInput) => Promise<TOutput>,
  options?: { actionName?: string }
) {
  return async (rawInput: unknown): Promise<TOutput | { success: false; error: string }> => {
    try {
      const validation = safeValidate(schema, rawInput);
      if (!validation.success) {
        return { success: false, error: validation.error } as any;
      }
      return await handler(validation.data);
    } catch (err: unknown) {
      const errorMsg = normalizeActionError(err);
      defaultLog.error({ err, actionName: options?.actionName }, `Action execution failed: ${errorMsg}`);
      return { success: false, error: errorMsg } as any;
    }
  };
}

/**
 * Authenticated user action: ensures caller is logged in, validates input schema.
 */
export function createAuthUserAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: (input: TInput, ctx: AuthContext) => Promise<TOutput>,
  options?: { actionName?: string }
) {
  return async (rawInput: unknown): Promise<TOutput | { success: false; error: string }> => {
    try {
      const ctx = await requireUser();
      const validation = safeValidate(schema, rawInput);
      if (!validation.success) {
        return { success: false, error: validation.error } as any;
      }
      return await handler(validation.data, ctx);
    } catch (err: unknown) {
      const errorMsg = normalizeActionError(err);
      defaultLog.error({ err, actionName: options?.actionName }, `Auth action failed: ${errorMsg}`);
      return { success: false, error: errorMsg } as any;
    }
  };
}

/**
 * Authenticated workspace action: ensures user is member of workspace with required role.
 */
export function createAuthWorkspaceAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  getWorkspaceId: (input: TInput) => string,
  handler: (input: TInput, ctx: WorkspaceAuthContext) => Promise<TOutput>,
  options?: { minRole?: WorkspaceRoleLevel; actionName?: string }
) {
  return async (rawInput: unknown): Promise<TOutput | { success: false; error: string }> => {
    try {
      const validation = safeValidate(schema, rawInput);
      if (!validation.success) {
        return { success: false, error: validation.error } as any;
      }
      const workspaceId = getWorkspaceId(validation.data);
      if (!workspaceId) {
        return { success: false, error: "Workspace ID is required." } as any;
      }
      const ctx = await requireWorkspaceMember(workspaceId, options?.minRole || "editor");
      return await handler(validation.data, ctx);
    } catch (err: unknown) {
      const errorMsg = normalizeActionError(err);
      defaultLog.error({ err, actionName: options?.actionName }, `Workspace action failed: ${errorMsg}`);
      return { success: false, error: errorMsg } as any;
    }
  };
}

/**
 * Authenticated delivery action: ensures user has access to delivery with required role.
 */
export function createAuthDeliveryAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  getDeliveryId: (input: TInput) => string,
  handler: (input: TInput, ctx: DeliveryAuthContext) => Promise<TOutput>,
  options?: { minRole?: WorkspaceRoleLevel; actionName?: string }
) {
  return async (rawInput: unknown): Promise<TOutput | { success: false; error: string }> => {
    try {
      const validation = safeValidate(schema, rawInput);
      if (!validation.success) {
        return { success: false, error: validation.error } as any;
      }
      const deliveryId = getDeliveryId(validation.data);
      if (!deliveryId) {
        return { success: false, error: "Delivery ID is required." } as any;
      }
      const ctx = await requireDeliveryAccess(deliveryId, options?.minRole || "editor");
      return await handler(validation.data, ctx);
    } catch (err: unknown) {
      const errorMsg = normalizeActionError(err);
      defaultLog.error({ err, actionName: options?.actionName }, `Delivery action failed: ${errorMsg}`);
      return { success: false, error: errorMsg } as any;
    }
  };
}

// ---------------------------------------------------------------------------
// Platform-admin actions
// ---------------------------------------------------------------------------

/** Why an admin made a change. Required for every admin write and kept in the audit log. */
export const adminReasonSchema = z
  .string({ error: "Say briefly why you're making this change." })
  .trim()
  .min(5, "Say briefly why you're making this change (at least 5 characters).")
  .max(500, "Keep the reason under 500 characters.");

export interface AdminActionTarget {
  type: string;
  id?: string | null;
  label?: string | null;
}

export interface AdminActionContext extends PlatformAdminContext {
  /** What the action changed, stored as the audit event's before and after. */
  recordChanges(changes: AdminAuditChanges): void;
  /** A readable name for the target once the handler has looked it up, e.g. a brand name. */
  setTargetLabel(label: string | null | undefined): void;
}

/** `error` is on both branches so callers can read it without strict null checks narrowing the union. */
export type AdminActionResult<TOutput> =
  | ({ success: true; error?: undefined } & TOutput)
  | { success: false; error: string };

const adminLog = createScopedLogger({ actionGroup: "platform-admin" });

async function requestMetadata(): Promise<{ requestId: string | null; ipAddress: string | null; userAgent: string | null }> {
  try {
    const headerList = await headers();
    return {
      requestId: headerList.get("x-request-id"),
      ipAddress: await getClientIp(),
      userAgent: headerList.get("user-agent")?.slice(0, 500) ?? null,
    };
  } catch {
    return { requestId: null, ipAddress: null, userAgent: null };
  }
}

/**
 * Platform-admin action. In order, it:
 *   1. checks the caller is a platform admin with a two-factor session (getPlatformAdminServices);
 *   2. validates the input, which must include a `reason`;
 *   3. applies the adminWrite rate limit, per admin;
 *   4. runs the handler on service-role services;
 *   5. writes an audit event (public.admin_audit_events), for failures too.
 * The handler gets the admin context plus recordChanges() and setTargetLabel() for the audit event.
 */
export function createPlatformAdminAction<TSchema extends z.ZodObject, TOutput extends object>(
  config: {
    /** Dotted audit name, e.g. "workspace.change_plan". */
    action: string;
    schema: TSchema;
    target: (input: z.infer<TSchema>) => AdminActionTarget;
  },
  handler: (input: z.infer<TSchema> & { reason: string }, ctx: AdminActionContext) => Promise<TOutput>
) {
  const schema = config.schema.extend({ reason: adminReasonSchema }) as unknown as z.ZodType<
    z.infer<TSchema> & { reason: string }
  >;

  return async (rawInput: unknown): Promise<AdminActionResult<TOutput>> => {
    let admin: PlatformAdminContext;
    try {
      admin = await getPlatformAdminServices();
    } catch (err: unknown) {
      return { success: false, error: normalizeActionError(err) };
    }

    const validation = safeValidate(schema, rawInput);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const input = validation.data;

    const limit = await checkRateLimit({ policy: RATELIMIT_POLICIES.adminWrite, identifier: admin.user.id });
    if (!limit.success) {
      return { success: false, error: limit.error || "Too many admin changes. Please try again shortly." };
    }

    const target = config.target(input);
    let targetLabel = target.label ?? null;
    let changes: AdminAuditChanges | null = null;
    const metadata = await requestMetadata();

    const recordAudit = async (outcome: "succeeded" | "failed", errorMessage?: string) => {
      const event = {
        actorId: admin.user.id,
        actorEmail: admin.user.email ?? null,
        action: config.action,
        targetType: target.type,
        targetId: target.id ?? null,
        targetLabel,
        reason: input.reason,
        outcome,
        errorMessage: errorMessage ?? null,
        changes,
        ...metadata,
      };
      try {
        await admin.audit.record(event);
      } catch (err: unknown) {
        // The change itself has already happened (or failed); keep the event in the logs at least.
        adminLog.error({ err, auditEvent: event }, "Couldn't write the admin audit event");
      }
    };

    try {
      const output = await handler(input, {
        ...admin,
        recordChanges: (recorded) => {
          changes = recorded;
        },
        setTargetLabel: (label) => {
          targetLabel = label ?? targetLabel;
        },
      });
      await recordAudit("succeeded");
      return { success: true, ...output };
    } catch (err: unknown) {
      const errorMsg = normalizeActionError(err);
      adminLog.error({ err, action: config.action, targetId: target.id }, `Admin action failed: ${errorMsg}`);
      await recordAudit("failed", errorMsg);
      return { success: false, error: errorMsg };
    }
  };
}
