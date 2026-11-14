export type Language = 'ar' | 'en';
export type AccountType = 'individual' | 'studio';

export interface WorkspaceFeatureConfig {
  storage_gb?: number;
  client_links?: number; // -1 for unlimited
  portfolio_videos?: number; // -1 for unlimited
  team_seats?: number;
  languages?: Array<'ar' | 'en'>;
  whatsapp_delivery?: boolean;
  password_protected?: boolean;
  watermark?: boolean;
  branding?: boolean;
  download_notifications?: boolean;
  priority_support?: boolean;
  silo_archive?: boolean;
  white_label?: boolean;
  [key: string]: any;
}

export interface WorkspaceFeatures {
  workspaceId: string;
  features: WorkspaceFeatureConfig;
  updatedAt: string;
}

export interface PlanLimits {
  storageBytesMax: number;
  storageGbMax: number;
  clientLinksMax: number; // -1 for unlimited
  teamSeatsMax: number;
  portfolioVideosMax: number; // -1 for unlimited
}

export interface PlanCapabilities {
  watermark: boolean;
  passwordProtect: boolean;
  customBranding: boolean;
  whiteLabel: boolean;
  sendWhatsApp: boolean;
  receiveDownloadNotifications: boolean;
  useSiloArchive: boolean;
  bilingual: boolean;
  prioritySupport: boolean;
}

export interface WorkspaceEntitlements {
  workspaceId: string;
  planSlug: string;
  planName: string;
  subscriptionStatus: string;
  isTrial: boolean;
  isActive: boolean;
  features: WorkspaceFeatureConfig;
  limits: PlanLimits;
  can: PlanCapabilities;
}

export interface Workspace {
  id: string;
  ownerId: string;
  brandName: string;
  slug: string;
  logoUrl?: string | null;
  customDomain?: string | null;
  accentColor?: string | null;
  defaultLanguage: Language;
  accountType: AccountType;
  storageUsedBytes: number;
  /**
   * Set while a platform admin has suspended the workspace: links closed, changes blocked. The
   * reason is internal and stays in the admin read model, so it never reaches members' browsers.
   */
  suspendedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
