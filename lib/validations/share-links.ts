import { z } from "zod";
import { emailSchema } from "./common";
import { MAX_PASSCODE_LENGTH, MIN_PASSCODE_LENGTH, passcodeProblem } from "@/lib/security/passphrase";

/** Empty text means "none". */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((value) => (value ? value : null));

/** A share link's settings, as the studio's Links screens send them (app/actions/share-links.ts). */
export const shareLinkSettingsSchema = z.object({
  label: z.string().trim().min(1, "Give the link a name.").max(80, "Link names can be at most 80 characters."),
  recipientName: optionalText(120, "Names can be at most 120 characters."),
  recipientEmail: z
    .union([z.literal(""), emailSchema])
    .nullish()
    .transform((value) => (value ? value.toLowerCase() : null)),
  /** ISO date, or null for a link that never expires. */
  expiresAt: z.string().nullable(),
  /** A new passcode; "" or null for none. Left out when editing: keep the current one. */
  passcode: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || passcodeProblem(value) === null, {
      message: `Passcodes need ${MIN_PASSCODE_LENGTH} to ${MAX_PASSCODE_LENGTH} characters.`,
    })
    .nullish(),
  canComment: z.boolean(),
  canApprove: z.boolean(),
  canDownload: z.boolean(),
  notifyOnOpen: z.boolean(),
  notifyOnDownload: z.boolean(),
  notifyOnComment: z.boolean(),
});

export const updateShareLinkSchema = shareLinkSettingsSchema.partial();

export type ShareLinkSettingsInput = z.input<typeof shareLinkSettingsSchema>;
export type UpdateShareLinkInput = z.input<typeof updateShareLinkSchema>;

export const shareLinkBulkActionSchema = z.object({
  linkIds: z.array(z.string().uuid()).min(1, "Pick at least one link.").max(200),
  action: z.enum(["revoke", "extend", "downloads_off"]),
});
