import { z } from "zod";

export const joinWaitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  referralCode: z.string().trim().optional().nullable(),
  role: z.string().trim().max(100).optional().nullable(),
  companySize: z.string().trim().max(50).optional().nullable(),
  honeypot: z.string().max(0, "Bot detected").optional().or(z.literal("")),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;

export const checkStatusSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type CheckStatusInput = z.infer<typeof checkStatusSchema>;

export const inviteCohortSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export type InviteCohortInput = z.infer<typeof inviteCohortSchema>;
