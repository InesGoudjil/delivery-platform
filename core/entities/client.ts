export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  /** When a studio member confirmed this client agreed to WhatsApp messages from CineSpace. */
  whatsappConsentAt?: string | null;
  whatsappConsentBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
