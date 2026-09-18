export type WaitlistStatus = "pending" | "invited" | "registered" | "rejected";

export interface WaitlistEntry {
  id: string;
  email: string;
  status: WaitlistStatus;
  referralCode: string;
  referredById?: string | null;
  referralCount: number;
  priorityScore: number;
  inviteToken?: string | null;
  invitedAt?: string | null;
  registeredAt?: string | null;
  role?: string | null;
  companySize?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistPositionResult {
  position: number;
  totalPending: number;
  referralCode: string;
  referralCount: number;
  priorityScore: number;
  status: WaitlistStatus;
}

export interface CreateWaitlistEntryDTO {
  email: string;
  referralCode: string;
  referredById?: string | null;
  role?: string | null;
  companySize?: string | null;
  metadata?: Record<string, any>;
}
