import crypto from "crypto";
import { IWaitlistRepository } from "@/core/repositories/waitlist.repository";
import { IEmailProvider } from "@/core/providers/email";
import {
  WaitlistEntry,
  WaitlistPositionResult,
} from "@/core/entities/waitlist";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "throwawaymail.com",
  "sharklasers.com",
  "getairmail.com",
  "dispostable.com",
  "yopmail.com",
  "trashmail.com",
]);

export interface JoinWaitlistInput {
  email: string;
  referralCode?: string | null;
  role?: string | null;
  companySize?: string | null;
  metadata?: Record<string, any>;
  baseUrl?: string;
}

export class WaitlistService {
  constructor(
    private readonly waitlistRepo: IWaitlistRepository,
    private readonly emailProvider: IEmailProvider
  ) {}

  private isDisposableEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
  }

  private generateReferralCode(): string {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
  }

  private generateInviteToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Register a user on the waitlist with referral attribution and position calculation
   */
  async joinWaitlist(input: JoinWaitlistInput): Promise<WaitlistPositionResult> {
    const email = input.email.toLowerCase().trim();

    if (this.isDisposableEmail(email)) {
      throw new Error("Temporary or disposable email addresses are not permitted.");
    }

    // Check if user already exists
    const existing = await this.waitlistRepo.findByEmail(email);
    if (existing) {
      return await this.waitlistRepo.getPosition(existing.id);
    }

    // Resolve referrer if valid code supplied
    let referredById: string | null = null;
    if (input.referralCode && input.referralCode.trim()) {
      const referrer = await this.waitlistRepo.findByReferralCode(input.referralCode.trim());
      if (referrer && referrer.email !== email) {
        referredById = referrer.id;
      }
    }

    // Generate unique referral code for this new registrant
    let code = this.generateReferralCode();
    while (await this.waitlistRepo.findByReferralCode(code)) {
      code = this.generateReferralCode();
    }

    // Create entry
    const entry = await this.waitlistRepo.create({
      email,
      referralCode: code,
      referredById,
      role: input.role,
      companySize: input.companySize,
      metadata: input.metadata,
    });

    // Reward referrer with a 10-point bump
    if (referredById) {
      await this.waitlistRepo.incrementReferralCount(referredById, 10);
    }

    // Calculate queue position
    const positionResult = await this.waitlistRepo.getPosition(entry.id);

    // Send transactional confirmation email asynchronously
    const baseUrl = input.baseUrl || "http://localhost:3000";
    const referralLink = `${baseUrl}?ref=${code}`;

    // Fire and forget email delivery to keep user request fast
    this.emailProvider
      .sendWaitlistWelcome({
        to: email,
        referralCode: code,
        position: positionResult.position,
        referralLink,
      })
      .catch((err) => {
        console.error(`[WaitlistService] Failed to send welcome email to ${email}:`, err);
      });

    return positionResult;
  }

  /**
   * Lookup queue status by email
   */
  async getStatusByEmail(email: string): Promise<WaitlistPositionResult | null> {
    const entry = await this.waitlistRepo.findByEmail(email);
    if (!entry) return null;
    return await this.waitlistRepo.getPosition(entry.id);
  }

  /**
   * Invite top N users in queue with a signed invite link
   */
  async inviteCohort(
    limit: number,
    baseUrl: string = "http://localhost:3000"
  ): Promise<{ invitedCount: number; invitedEmails: string[] }> {
    const pending = await this.waitlistRepo.listTopPending(limit);
    const invitedEmails: string[] = [];

    for (const entry of pending) {
      const token = this.generateInviteToken();
      await this.waitlistRepo.markInvited(entry.id, token);

      const inviteLink = `${baseUrl}/invite/${token}`;
      await this.emailProvider.sendWaitlistInvite({
        to: entry.email,
        inviteToken: token,
        inviteLink,
      });

      invitedEmails.push(entry.email);
    }

    return {
      invitedCount: invitedEmails.length,
      invitedEmails,
    };
  }

  /**
   * Verify an invite token and return the associated entry
   */
  async verifyInviteToken(token: string): Promise<WaitlistEntry | null> {
    const entry = await this.waitlistRepo.findByInviteToken(token);
    if (!entry || entry.status !== "invited") {
      return null;
    }
    return entry;
  }

  /**
   * Complete onboarding for an invited user
   */
  async claimInvite(token: string): Promise<WaitlistEntry> {
    const entry = await this.verifyInviteToken(token);
    if (!entry) {
      throw new Error("Invalid or expired invite token.");
    }
    return await this.waitlistRepo.markRegistered(entry.id);
  }

  /**
   * Fetch waitlist metrics for admin dashboard
   */
  async getDashboardMetrics() {
    return await this.waitlistRepo.getMetrics();
  }

  /**
   * List pending entries for admin review
   */
  async listPending(limit: number = 50) {
    return await this.waitlistRepo.listTopPending(limit);
  }
}
