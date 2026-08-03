export type ProjectStatus = 'draft' | 'review' | 'delivered';
export type ProjectType = 'film' | 'photo' | 'commercial';

export interface Profile {
  id: string;
  brandName: string;
  handle: string;
  accentColor: string;
  whatsappNumber?: string;
  subscriptionStatus: 'trialing' | 'active' | 'canceled';
  template: string;
  bio?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  client: string;
  type: ProjectType;
  status: ProjectStatus;
  tc?: string;
  g?: string;
  pinned?: boolean;
  desc?: string;
  createdAt: string;
}

export interface VideoVersion {
  id: string;
  projectId: string;
  versionLabel: string;
  cloudflareStreamId?: string;
  storagePath?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  projectId: string;
  versionId?: string;
  who: 'client' | 'me';
  meta: string;
  text: string;
  createdAt: string;
}
