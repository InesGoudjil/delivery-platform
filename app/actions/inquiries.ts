"use server";

import { getServerAdminServices, getServerCore } from "@/core/server";
import {
  renderPortfolioLeadEmail,
  renderContactFormEmail,
} from "@/core/providers/email/templates";
import {
  submitPortfolioInquirySchema,
  submitContactFormSchema,
  submitPartnershipSchema,
  safeValidate,
  type SubmitPortfolioInquiryInput,
  type SubmitContactFormInput,
  type SubmitPartnershipInput,
} from "@/lib/validations";
import { createScopedLogger } from "@/lib/logger";

const log = createScopedLogger({ actionGroup: "inquiries" });

/**
 * Server Action: Submit a client lead/inquiry from a filmmaker's public portfolio.
 * Stores inquiry in the database and dispatches an instant notification email via Zoho ZeptoMail.
 */
export async function submitPortfolioInquiryAction(input: SubmitPortfolioInquiryInput) {
  try {
    const validated = safeValidate(submitPortfolioInquirySchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { handle, name: cleanName, emailOrPhone: cleanContact, details: cleanDetails } = validated.data;
    const cleanHandle = handle.toLowerCase();

    const core = await getServerCore();

    // 1. The studio by workspace slug or portfolio slug. Visitors have no database access
    //    of their own, so this reads with the service role, and only published portfolios
    //    take inquiries.
    const admin = await getServerAdminServices();
    let workspace = await admin.workspace.getWorkspaceBySlug(cleanHandle).catch(() => null);
    let portfolio = workspace ? await admin.portfolio.getPortfolioByWorkspace(workspace.id).catch(() => null) : null;
    if (!portfolio) {
      const publicView = await admin.portfolio.getPublicPortfolio(cleanHandle).catch(() => null);
      if (publicView) {
        workspace = await admin.workspace.getWorkspaceById(publicView.workspaceId).catch(() => null);
        portfolio = workspace ? await admin.portfolio.getPortfolioByWorkspace(workspace.id).catch(() => null) : null;
      }
    }
    if (!workspace || !portfolio || !portfolio.isPublished) {
      return { success: false, error: "This portfolio isn't accepting inquiries right now." };
    }

    const filmmakerName = workspace?.brandName || (portfolio ? portfolio.title : "Filmmaker");

    // 2. Resolve filmmaker recipient email
    let ownerEmail: string | null = null;
    if (workspace?.ownerId) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase.auth.admin.getUserById(workspace.ownerId);
        if (userData?.user?.email) {
          ownerEmail = userData.user.email;
        }
      } catch (e: any) {
        log.warn({ err: e, ownerId: workspace.ownerId }, "Could not resolve owner email from auth");
      }
    }

    if (!ownerEmail && (portfolio?.socialLinks as any)?.email) {
      ownerEmail = (portfolio?.socialLinks as any).email;
    }

    // 3. Save inquiry to Supabase inquiries repository
    const inquiryRecord = await core.repositories.inquiry.create({
      type: "portfolio_lead",
      workspaceId: workspace?.id || null,
      portfolioId: portfolio?.id || null,
      name: cleanName,
      email: cleanContact,
      phone: cleanContact.includes("@") ? null : cleanContact,
      subject: `Project Inquiry for ${filmmakerName}`,
      message: cleanDetails,
      metadata: {
        handle: cleanHandle,
        filmmakerName,
      },
    });

    // 4. Send notification email via Zoho ZeptoMail
    const recipient = ownerEmail || process.env.CONTACT_EMAIL || "filmmaker@cinespace.film";
    const { subject, html } = renderPortfolioLeadEmail({
      clientName: cleanName,
      clientContact: cleanContact,
      projectDetails: cleanDetails,
      filmmakerName,
      portfolioHandle: cleanHandle,
      brandName: filmmakerName,
    });

    const isEmailContact = cleanContact.includes("@");
    await core.services.email.sendEmail({
      to: recipient,
      subject,
      html,
      replyTo: isEmailContact ? cleanContact : undefined,
    });

    return { success: true, inquiryId: inquiryRecord.id };
  } catch (err: any) {
    log.error({ err }, "submitPortfolioInquiryAction error");
    return { success: false, error: err.message || "Failed to submit project inquiry." };
  }
}

/**
 * Server Action: Submit a general contact or feedback message from /contact.
 * Stores message in inquiries table and notifies team via Resend.
 */
export async function submitContactFormAction(input: SubmitContactFormInput) {
  try {
    const validated = safeValidate(submitContactFormSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const { email: cleanEmail, message: cleanMessage, fullName: cleanName, reason: cleanReason } = validated.data;

    const core = await getServerCore();

    // 1. Save inquiry to Supabase inquiries repository
    const inquiryRecord = await core.repositories.inquiry.create({
      type: "contact_message",
      name: cleanName,
      email: cleanEmail,
      subject: cleanReason ? `[${cleanReason}] Website Contact Message` : "Website Contact Message",
      message: cleanMessage,
      metadata: {
        reason: cleanReason,
      },
    });

    // 2. Send notification email via Zoho ZeptoMail
    const { subject, html } = renderContactFormEmail({
      fullName: cleanName,
      email: cleanEmail,
      reason: cleanReason,
      message: cleanMessage,
    });

    const contactRecipient =
      process.env.CONTACT_EMAIL ||
      process.env.ZEPTOMAIL_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "contact@cinespace.film";
    await core.services.email.sendEmail({
      to: contactRecipient,
      subject,
      html,
      replyTo: cleanEmail,
    });

    return { success: true, inquiryId: inquiryRecord.id };
  } catch (err: any) {
    log.error({ err }, "submitContactFormAction error");
    return { success: false, error: err.message || "Failed to submit contact message." };
  }
}

/**
 * Server Action: Submit a creator partnership application.
 * Stores lead in inquiries table and notifies team via Zoho ZeptoMail.
 */
export async function submitPartnershipAction(input: SubmitPartnershipInput) {
  try {
    const validated = safeValidate(submitPartnershipSchema, input);
    if (!validated.success) {
      return { success: false, error: validated.error };
    }

    const {
      email: cleanEmail,
      fullName: cleanName,
      platform,
      socialHandle,
      portfolioUrl,
      otherLinks,
      whyPartner,
    } = validated.data;

    const core = await getServerCore();
    const message = `Platform: ${platform}\nSocial Handle: ${socialHandle}\nPortfolio: ${portfolioUrl}\nOther Links: ${otherLinks || 'None'}\nWhy Partner: ${whyPartner || 'None'}`;

    const inquiryRecord = await core.repositories.inquiry.create({
      type: "partnership_lead",
      name: cleanName,
      email: cleanEmail,
      subject: `[Partnership Application] ${cleanName} (${platform} ${socialHandle})`,
      message,
      metadata: {
        platform,
        socialHandle,
        portfolioUrl,
        otherLinks,
      },
    });

    const { subject, html } = renderContactFormEmail({
      fullName: cleanName,
      email: cleanEmail,
      reason: "Partnership Application",
      message,
    });

    const contactRecipient =
      process.env.CONTACT_EMAIL ||
      process.env.ZEPTOMAIL_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "contact@cinespace.film";
    await core.services.email.sendEmail({
      to: contactRecipient,
      subject,
      html,
      replyTo: cleanEmail,
    });

    return { success: true, inquiryId: inquiryRecord.id };
  } catch (err: any) {
    log.error({ err }, "submitPartnershipAction error");
    return { success: false, error: err.message || "Failed to submit partnership application." };
  }
}
