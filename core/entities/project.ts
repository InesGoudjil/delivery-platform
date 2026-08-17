export type ProjectStatus = 'draft' | 'in_review' | 'approved' | 'archived';

export interface Project {
  id: string;
  workspaceId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  shareToken: string;
  passcodeHash?: string | null;
  status: ProjectStatus;
  isDownloadAllowed: boolean;
  notifyOnDownload: boolean;
  approvedAt?: string | null;
  approvedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}
