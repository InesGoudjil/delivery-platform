"use server";

import { headers } from "next/headers";
import { getServerServices } from "@/core/server";
import {
  joinWaitlistSchema,
  checkStatusSchema,
  inviteCohortSchema,
} from "@/lib/validations/waitlist";
import { WaitlistPositionResult } from "@/core/entities/waitlist";

export interface WaitlistActionState {
  success?: boolean;
  error?: string | null;
  data?: WaitlistPositionResult | null;
}

export async function joinWaitlistAction(
  prevState: WaitlistActionState | null,
  formData: FormData
): Promise<WaitlistActionState> {
  const email = formData.get("email") as string;
  const referralCode = (formData.get("referralCode") as string) || undefined;
  const role = (formData.get("role") as string) || undefined;
  const companySize = (formData.get("companySize") as string) || undefined;
  const honeypot = (formData.get("hp_field") as string) || "";

  const parsed = joinWaitlistSchema.safeParse({
    email,
    referralCode,
    role,
    companySize,
    honeypot,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid email or input.",
    };
  }

  // Honeypot anti-spam trigger
  if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
    // Silently succeed to trick bots without adding to database
    return {
      success: true,
      data: {
        position: 1,
        totalPending: 100,
        referralCode: "PROMO",
        referralCount: 0,
        priorityScore: 0,
        status: "pending",
      },
    };
  }

  try {
    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const services = await getServerServices();
    const result = await services.waitlist.joinWaitlist({
      email: parsed.data.email,
      referralCode: parsed.data.referralCode,
      role: parsed.data.role,
      companySize: parsed.data.companySize,
      baseUrl,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Something went wrong while joining the waitlist.",
    };
  }
}

export async function checkWaitlistStatusAction(
  email: string
): Promise<WaitlistActionState> {
  const parsed = checkStatusSchema.safeParse({ email });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Please enter a valid email.",
    };
  }

  try {
    const services = await getServerServices();
    const result = await services.waitlist.getStatusByEmail(parsed.data.email);

    if (!result) {
      return {
        success: false,
        error: "This email is not registered on the waitlist yet.",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to retrieve waitlist status.",
    };
  }
}

export async function inviteWaitlistCohortAction(limit: number = 20) {
  const parsed = inviteCohortSchema.safeParse({ limit });
  if (!parsed.success) {
    return { success: false, error: "Invalid invite cohort limit." };
  }

  try {
    const headerList = await headers();
    const host = headerList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const services = await getServerServices();
    const result = await services.waitlist.inviteCohort(parsed.data.limit, baseUrl);

    return {
      success: true,
      ...result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to invite cohort.",
    };
  }
}
