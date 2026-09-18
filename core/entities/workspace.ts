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
  createdAt: string;
  updatedAt: string;
}
