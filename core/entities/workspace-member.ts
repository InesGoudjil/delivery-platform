export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
