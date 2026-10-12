/**
 * Responsive, bulletproof email templates for CineSpace / Cut Delivery Platform.
 * Designed with a sleek dark aesthetic, mobile responsiveness, and high deliverability.
 */

interface BaseEmailWrapperOptions {
  title: string;
  previewText?: string;
  brandName?: string;
  contentHtml: string;
  footerText?: string;
}

/**
 * Base email layout wrapper ensuring consistent typography, branding, and dark styling.
 */
export function wrapEmailTemplate({
  title,
  previewText,
  brandName = "CineSpace",
  contentHtml,
  footerText = "Cut & CineSpace Studio Delivery Platform",
}: BaseEmailWrapperOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${title}</title>
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ""}
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #09090b; }
    a { color: #f5551d; text-decoration: none; }
    @media screen and (max-width: 600px) {
      .container-table { width: 100% !important; }
      .content-padding { padding: 24px 20px !important; }
      .btn { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="580">
        <tr>
        <td align="center" valign="top" width="580">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #121214; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" class="container-table">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #27272a; background-color: #121214;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="font-size: 19px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                    <span style="display: inline-block; width: 10px; height: 10px; background-color: #f5551d; border-radius: 2px; margin-right: 8px;"></span>${brandName}
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-family: monospace; background-color: #27272a; color: #a1a1aa; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Studio</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td class="content-padding" style="padding: 36px 32px 32px 32px;">
              ${contentHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0d0d0f; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a;">${footerText}</p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">If you received this by mistake, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ------------------------------------------------------------------------------------------------
// 1. WAITLIST WELCOME EMAIL
// ------------------------------------------------------------------------------------------------
export interface WaitlistWelcomeEmailProps {
  position: number;
  referralCode: string;
  referralLink: string;
  totalWaiting?: number;
}

export function renderWaitlistWelcomeEmail({
  position,
  referralCode,
  referralLink,
  totalWaiting,
}: WaitlistWelcomeEmailProps): { subject: string; html: string } {
  const subject = `🎬 You're on the waitlist! (Position #${position})`;
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      You're in line! 🎉
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
      Thank you for joining CineSpace. We're rolling out access in batches to ensure seamless 4K video deliveries and instant client review workflows.
    </p>

    <!-- Position Badge -->
    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 28px;">
      <div style="font-size: 12px; text-transform: uppercase; color: #71717a; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Your Current Position</div>
      <div style="font-size: 36px; font-weight: 800; color: #f5551d; font-family: monospace;">#${position}</div>
      ${totalWaiting ? `<div style="font-size: 12px; color: #71717a; margin-top: 4px;">out of ${totalWaiting.toLocaleString()} creative studios</div>` : ""}
    </div>

    <!-- Referral Bump Box -->
    <div style="background: linear-gradient(180deg, #1c1917 0%, #141312 100%); border: 1px solid #442618; border-radius: 10px; padding: 22px; margin-bottom: 28px;">
      <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #ff8a45;">
        🚀 Jump ahead in the queue
      </h3>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #d6d3d1; line-height: 1.5;">
        Share your unique referral link with fellow video editors, creators, or agencies. Each person who joins using your link jumps you <strong>10 spots higher</strong>.
      </p>
      
      <div style="background-color: #0c0a09; border: 1px dashed #78350f; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; word-break: break-all;">
        <span style="font-family: monospace; font-size: 14px; color: #fcd34d; font-weight: 600;">${referralLink}</span>
      </div>

      <div style="font-size: 12px; color: #a8a29e;">
        Referral Code: <strong style="color: #ffffff; font-family: monospace;">${referralCode}</strong>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${referralLink}" class="btn" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 28px; border-radius: 8px; display: inline-block;">
        Check Your Live Status &rarr;
      </a>
    </div>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: `Your current waitlist position is #${position}. Share your link to jump ahead.`,
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 2. WAITLIST ACCESS GRANTED (COHORT INVITE)
// ------------------------------------------------------------------------------------------------
export interface WaitlistInviteEmailProps {
  inviteLink: string;
  expiresInDays?: number;
}

export function renderWaitlistInviteEmail({
  inviteLink,
  expiresInDays = 7,
}: WaitlistInviteEmailProps): { subject: string; html: string } {
  const subject = `🚀 You're invited! Claim early access to CineSpace`;
  const contentHtml = `
    <div style="display: inline-block; background-color: #064e3b; color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">
      Access Granted
    </div>
    <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      Your spot is ready! 🎬
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
      Great news! You've reached the front of the waitlist. Your CineSpace studio invite is now active and ready to claim.
    </p>

    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
      <div style="font-size: 13px; font-weight: 600; color: #ffffff; margin-bottom: 8px;">What's unlocked for you:</div>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #a1a1aa; line-height: 1.7;">
        <li>Fast 4K video deliveries with instant browser playback</li>
        <li>Pinpoint timecoded client feedback (no client login needed)</li>
        <li>Passcode protection and custom studio branding</li>
        <li>Client signoff &amp; one-click cut approvals</li>
      </ul>
    </div>

    <div style="text-align: center; margin-bottom: 28px;">
      <a href="${inviteLink}" class="btn" style="background-color: #f5551d; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(245, 85, 29, 0.4);">
        Claim Early Access &rarr;
      </a>
    </div>

    <p style="font-size: 13px; color: #71717a; text-align: center; margin: 0 0 12px 0;">
      This invite link is valid for the next ${expiresInDays} days.
    </p>
    <div style="background-color: #121214; border: 1px solid #27272a; border-radius: 6px; padding: 10px; font-size: 12px; color: #71717a; word-break: break-all; text-align: center;">
      ${inviteLink}
    </div>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: "Your CineSpace early access invitation is ready to be claimed.",
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 3. FORGOT PASSWORD / PASSWORD RESET EMAIL
// ------------------------------------------------------------------------------------------------
export interface ResetPasswordEmailProps {
  resetLink: string;
  userEmail?: string;
}

export function renderResetPasswordEmail({
  resetLink,
  userEmail,
}: ResetPasswordEmailProps): { subject: string; html: string } {
  const subject = `Reset your CineSpace account password`;
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      Reset your password 🔒
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
      We received a request to reset the password for ${userEmail ? `<strong style="color: #ffffff;">${userEmail}</strong>` : "your account"}. Click the button below to choose a new password:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" class="btn" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 34px; border-radius: 8px; display: inline-block;">
        Reset Password &rarr;
      </a>
    </div>

    <div style="background-color: #18181b; border-left: 3px solid #f5551d; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
        ⚠️ For your security, this password reset link will expire in <strong>1 hour</strong>. If you did not request this change, you can safely ignore this email; your password will remain unchanged.
      </p>
    </div>

    <p style="font-size: 12px; color: #71717a; margin-bottom: 8px;">
      Having trouble with the button? Copy and paste this URL into your browser:
    </p>
    <div style="background-color: #0c0a09; border: 1px solid #27272a; border-radius: 6px; padding: 10px; font-size: 12px; color: #a1a1aa; word-break: break-all;">
      ${resetLink}
    </div>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: "Instructions to reset your CineSpace password.",
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 4. WORKSPACE TEAM MEMBER INVITATION EMAIL
// ------------------------------------------------------------------------------------------------
export interface MemberInvitationEmailProps {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteLink: string;
}

export function renderMemberInvitationEmail({
  inviterName,
  workspaceName,
  role,
  inviteLink,
}: MemberInvitationEmailProps): { subject: string; html: string } {
  const roleFormatted = role.charAt(0).toUpperCase() + role.slice(1);
  const subject = `Join ${workspaceName} on CineSpace`;
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      You've been invited to collaborate
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
      <strong style="color: #ffffff;">${inviterName}</strong> has invited you to join the creative team at <strong style="color: #ffffff;">${workspaceName}</strong> as a <strong style="color: #f5551d;">${roleFormatted}</strong>.
    </p>

    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 12px; text-transform: uppercase; color: #71717a; font-weight: 600;">Workspace</span>
        <span style="font-size: 12px; text-transform: uppercase; color: #a1a1aa; font-weight: 600;">Role Assigned</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 16px; font-weight: 600; color: #ffffff;">${workspaceName}</span>
        <span style="font-size: 13px; font-weight: 700; background-color: #27272a; color: #f5551d; padding: 3px 10px; border-radius: 4px;">${roleFormatted}</span>
      </div>
      <div style="font-size: 13px; color: #a1a1aa; margin-top: 10px; border-top: 1px solid #27272a; padding-top: 10px;">
        Collaborate on client video cuts, review timecoded notes, and manage deliverables.
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${inviteLink}" class="btn" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 34px; border-radius: 8px; display: inline-block;">
        Accept Invitation &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
      If you were not expecting this invitation, you can safely ignore this email.
    </p>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: `${inviterName} invited you to collaborate in ${workspaceName}.`,
      brandName: workspaceName,
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 5. VIDEO CUT DELIVERY / REVIEW EMAIL (SENT TO CLIENT)
// ------------------------------------------------------------------------------------------------
export interface DeliveryReviewEmailProps {
  brandName: string;
  projectTitle: string;
  projectDescription?: string;
  reviewUrl: string;
  customMessage?: string;
  isPasscodeProtected?: boolean;
}

export function renderDeliveryReviewEmail({
  brandName,
  projectTitle,
  projectDescription,
  reviewUrl,
  customMessage,
  isPasscodeProtected,
}: DeliveryReviewEmailProps): { subject: string; html: string } {
  const subject = `🎬 Review: ${projectTitle} (${brandName})`;

  const customMsgHtml = customMessage
    ? `<div style="background-color: #18181b; border-left: 3px solid #f5551d; padding: 14px 18px; border-radius: 6px; margin: 20px 0; color: #e4e4e7; font-size: 14px; line-height: 1.5;">${customMessage.replace(/\n/g, "<br/>")}</div>`
    : "";

  const passcodeNotice = isPasscodeProtected
    ? `<div style="margin: 16px 0; padding: 10px 14px; background-color: #27272a; border-radius: 6px; font-size: 13px; color: #a1a1aa;">
         🔒 <strong>Passcode Protected:</strong> This delivery requires the passcode provided by ${brandName}.
       </div>`
    : "";

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff;">Your video cut is ready for review</h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #a1a1aa; line-height: 1.5;">
      <strong style="color: #f4f4f5;">${brandName}</strong> has prepared a new version for you to review and approve.
    </p>

    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
      <div style="font-size: 12px; text-transform: uppercase; color: #71717a; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Project</div>
      <div style="font-size: 17px; font-weight: 600; color: #ffffff;">${projectTitle}</div>
      ${projectDescription ? `<div style="font-size: 13px; color: #a1a1aa; margin-top: 6px;">${projectDescription}</div>` : ""}
    </div>

    ${customMsgHtml}
    ${passcodeNotice}

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${reviewUrl}" class="btn" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
        Watch &amp; Leave Feedback &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
      No login required. Click directly on the video player to pin timecoded comments.
    </p>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: `${brandName} shared "${projectTitle}" for your review.`,
      brandName,
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 6. CUT APPROVED NOTIFICATION EMAIL (SENT TO STUDIO)
// ------------------------------------------------------------------------------------------------
export interface CutApprovedEmailProps {
  brandName: string;
  projectTitle: string;
  approvedByName: string;
  dashboardUrl: string;
}

export function renderCutApprovedEmail({
  brandName,
  projectTitle,
  approvedByName,
  dashboardUrl,
}: CutApprovedEmailProps): { subject: string; html: string } {
  const subject = `✅ Cut Approved: "${projectTitle}" by ${approvedByName}`;
  const contentHtml = `
    <div style="display: inline-block; background-color: #064e3b; color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">
      ✨ Client Signoff
    </div>
    <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
      ${approvedByName} approved "${projectTitle}"!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.5;">
      Congratulations! The client has officially reviewed and approved this cut.
    </p>

    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
      <div style="font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Delivery Title</div>
      <div style="font-size: 16px; font-weight: 600; color: #ffffff;">${projectTitle}</div>
      <div style="font-size: 13px; color: #34d399; margin-top: 6px;">Approved by: <strong>${approvedByName}</strong></div>
    </div>

    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${dashboardUrl}" class="btn" style="background-color: #10b981; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
        View Delivery in Dashboard &rarr;
      </a>
    </div>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: `${approvedByName} has approved ${projectTitle}.`,
      brandName,
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 7. NEW TIMECODED FEEDBACK / COMMENT EMAIL (SENT TO STUDIO)
// ------------------------------------------------------------------------------------------------
export interface NewFeedbackEmailProps {
  brandName: string;
  projectTitle: string;
  authorName: string;
  commentText: string;
  timecode: string;
  reviewUrl: string;
}

export function renderNewFeedbackEmail({
  brandName,
  projectTitle,
  authorName,
  commentText,
  timecode,
  reviewUrl,
}: NewFeedbackEmailProps): { subject: string; html: string } {
  const subject = `💬 Feedback from ${authorName} on "${projectTitle}" [${timecode}]`;
  const contentHtml = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
      ${authorName} left a new comment
    </h2>

    <div style="background-color: #18181b; border: 1px solid #27272a; border-left: 3px solid #f5551d; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
      <div style="font-size: 13px; color: #a1a1aa; margin-bottom: 8px;">
        Comment at <strong style="color: #f5551d; font-family: monospace;">[${timecode}]</strong>:
      </div>
      <div style="font-size: 15px; color: #ffffff; font-style: italic; line-height: 1.5;">
        &ldquo;${commentText}&rdquo;
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${reviewUrl}" class="btn" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block;">
        Open Cut &amp; Reply &rarr;
      </a>
    </div>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: `${authorName} commented at ${timecode}: "${commentText.slice(0, 50)}..."`,
      brandName,
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 8. SUPABASE AUTH EMAIL VERIFICATION / CONFIRM SIGNUP
// ------------------------------------------------------------------------------------------------
export interface ConfirmSignupEmailProps {
  confirmLink: string;
}

export function renderConfirmSignupEmail({
  confirmLink,
}: ConfirmSignupEmailProps): { subject: string; html: string } {
  const subject = `Confirm your CineSpace account email`;
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      Welcome to CineSpace! 🎬
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
      Thank you for creating an account. Please verify your email address to activate your workspace and start delivering video cuts:
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${confirmLink}" class="btn" style="background-color: #f5551d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 34px; border-radius: 8px; display: inline-block;">
        Verify Email Address &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #71717a; margin-bottom: 8px;">
      Or copy and paste this link in your browser:
    </p>
    <div style="background-color: #0c0a09; border: 1px solid #27272a; border-radius: 6px; padding: 10px; font-size: 12px; color: #a1a1aa; word-break: break-all;">
      ${confirmLink}
    </div>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: "Confirm your email address to get started with CineSpace.",
      contentHtml,
    }),
  };
}

// ------------------------------------------------------------------------------------------------
// 9. THE SILO — RESTORE / THAW COMPLETED
// ------------------------------------------------------------------------------------------------
export interface SiloRestoreCompletedEmailProps {
  projectTitle: string;
  manageUrl: string;
  brandName?: string;
  thawedDays?: number;
}

export function renderSiloRestoreCompletedEmail({
  projectTitle,
  manageUrl,
  brandName = "CineSpace",
  thawedDays = 7,
}: SiloRestoreCompletedEmailProps): { subject: string; html: string } {
  const subject = `🧊 S3 Glacier Thaw Complete: "${projectTitle}" is ready`;
  const contentHtml = `
    <div style="display: inline-block; background-color: #0c4a6e; color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;">
      The Silo — Restored from Cold Archive
    </div>

    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
      "${projectTitle}" is thawed and ready!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
      Your project has been successfully retrieved from <strong style="color: #ffffff;">AWS S3 Glacier Deep Archive</strong>.
      All master cut files, asset versions, and deliverables have been restored and are now accessible in your workspace for download or re-delivery.
    </p>

    <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <div style="font-size: 13px; color: #e4e4e7; font-weight: 600; margin-bottom: 6px;">
        ⏱️ Active Window Notice
      </div>
      <div style="font-size: 13px; color: #a1a1aa; line-height: 1.5;">
        This thawed project will remain in active storage for <strong style="color: #ffffff;">${thawedDays} days</strong>. You can re-archive it to The Silo at any time to preserve active space.
      </div>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${manageUrl}" class="btn" style="background-color: #0284c7; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 34px; border-radius: 8px; display: inline-block;">
        Open Project in Workspace &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #71717a; margin-bottom: 8px;">
      Direct workspace link:
    </p>
    <div style="background-color: #0c0a09; border: 1px solid #27272a; border-radius: 6px; padding: 10px; font-size: 12px; color: #a1a1aa; word-break: break-all;">
      ${manageUrl}
    </div>
  `;

  return {
    subject,
    html: wrapEmailTemplate({
      title: subject,
      previewText: `AWS S3 Glacier Thaw Complete: "${projectTitle}" has been retrieved from cold storage and is ready.`,
      brandName,
      contentHtml,
    }),
  };
}
