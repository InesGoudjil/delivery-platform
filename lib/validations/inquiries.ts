import { z } from "zod";
import { emailSchema } from "./common";

export const submitPortfolioInquirySchema = z.object({
  handle: z.string().trim().min(1, "Portfolio handle is required"),
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(100, "Name cannot exceed 100 characters"),
  emailOrPhone: z
    .string()
    .trim()
    .min(3, "Please provide a valid contact email or phone number")
    .max(100, "Contact information is too long"),
  details: z
    .string()
    .trim()
    .min(2, "Please share some details about your project")
    .max(5000, "Project details cannot exceed 5000 characters"),
});

export type SubmitPortfolioInquiryInput = z.infer<typeof submitPortfolioInquirySchema>;

export const submitContactFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(100, "Name cannot exceed 100 characters")
    .default("Anonymous"),
  email: emailSchema,
  reason: z.string().trim().max(100).optional(),
  message: z
    .string()
    .trim()
    .min(2, "Message is required")
    .max(5000, "Message cannot exceed 5000 characters"),
});

export type SubmitContactFormInput = z.infer<typeof submitContactFormSchema>;

export const submitPartnershipSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters"),
  email: emailSchema,
  platform: z
    .string()
    .trim()
    .min(1, "Platform is required")
    .max(100, "Platform is too long"),
  socialHandle: z
    .string()
    .trim()
    .min(1, "Social handle is required")
    .max(100, "Social handle is too long"),
  portfolioUrl: z
    .string()
    .trim()
    .min(1, "Portfolio URL is required")
    .max(500, "Portfolio URL is too long"),
  otherLinks: z.string().trim().max(1000).optional(),
  whyPartner: z.string().trim().max(3000).optional(),
});

export type SubmitPartnershipInput = z.infer<typeof submitPartnershipSchema>;
