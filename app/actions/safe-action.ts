import { z } from "zod";
import { formatZodError, safeValidate } from "@/lib/validations";
import { createScopedLogger } from "@/lib/logger";
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
