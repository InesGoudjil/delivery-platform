export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}
