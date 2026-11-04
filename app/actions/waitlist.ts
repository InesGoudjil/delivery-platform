"use server";

import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { getServerServices } from "@/core/server";
import { sendServerEvent } from "@/lib/meta";
import { captureWaitlistLead } from "@/lib/posthog";
import {
  joinWaitlistSchema,
  checkStatusSchema,
  inviteCohortSchema,
} from "@/lib/validations/waitlist";
import { WaitlistPositionResult } from "@/core/entities/waitlist";

export interface WaitlistActionState {
  success?: boolean;
  error?: string | null;
  data?: (WaitlistPositionResult & { eventId?: string }) | null;
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

    // Fire server-side Lead. The same eventId is returned to the client
    // so the browser pixel can echo it and Meta dedupes.
    const eventId = `lead_${randomUUID()}`;
    try {
      const ip =
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerList.get("x-real-ip") ||
        undefined;
      const userAgent = headerList.get("user-agent") || undefined;
      const referer = headerList.get("referer") || undefined;
      await sendServerEvent({
        eventName: "Lead",
        eventId,
        eventSourceUrl: referer,
        actionSource: "website",
        userData: { email: parsed.data.email },
        customData: {
          content_name: "waitlist",
          content_category: "waitlist",
          status: result.status,
        },
        clientIp: ip,
        userAgent,
      });
    } catch (e) {
      // sendServerEvent already swallows + logs; defensive only.
    }

    // PostHog: server-side waitlist_joined. PostHog will merge this
    // with the client's anonymous `$anon_id` once the same visitor
    // signs up via PostHogIdentify.
    try {
      captureWaitlistLead({
        email: parsed.data.email,
        role: parsed.data.role,
        companySize: parsed.data.companySize,
        referralCode: parsed.data.referralCode,
        status: result.status,
      });
    } catch (e) {
      // already logged
    }

    return {
      success: true,
      data: { ...result, eventId },
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
