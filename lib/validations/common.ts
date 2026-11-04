import { z } from "zod";

/**
 * Standard reusable Zod primitives and helpers across the application.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const optionalEmailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .optional()
  .or(z.literal(""));

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Color must be a valid hex code (e.g. #f5551d)");

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters")
  .max(100, "Slug cannot exceed 100 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens without consecutive hyphens"
  );

export const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid identifier format (UUID expected)"
  );

/**
 * Extracts a single friendly error message from a ZodError.
 */
export function formatZodError(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) return "Validation error occurred.";
  return firstIssue.message || "Invalid input provided.";
}

export type SafeValidateResult<T> =
  | { success: true; data: T; error?: string }
  | { success: false; error: string; data?: T };

/**
 * Helper to safely parse input data and return formatted errors for server actions.
 */
export function safeValidate<T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: z.ZodError } },
  data: unknown
): SafeValidateResult<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: formatZodError((result as any).error) };
  }
  return { success: true, data: result.data };
}
