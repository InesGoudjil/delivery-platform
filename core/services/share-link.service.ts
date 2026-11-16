import { randomBytes } from "crypto";
import type {
  CreateShareLinkDTO,
  ShareLink,
  ShareLinkEvent,
  ShareLinkEventKind,
  UpdateShareLinkDTO,
  WorkspaceShareLink,
} from "@/core/entities/share-link";
import type { Delivery } from "@/core/entities/delivery";
import type { SupabaseShareLinkRepository } from "@/core/repositories/share-link.repository";

export const PRIMARY_LINK_REFUSAL = "The main link can't be turned off or deleted. Make another link the main one first.";

/** Whether share_links exists, per server process. Re-checked soon after a "no", so applying the migration shows up quickly. */
let installed: { value: boolean; until: number } | null = null;
const INSTALLED_TTL_MS = 5 * 60_000;
const NOT_INSTALLED_TTL_MS = 30_000;

/** Test hook: forget what the last check found. */
export function resetShareLinksInstalledCache(): void {
  installed = null;
}

export function newShareLinkToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Client links into delivery rooms. Reads use the caller's client (row-level security for
 * members, the service role for the client room). Writes use the service role: callers check
 * the visitor's access first (an admin of the workspace, or the room gate).
 */
export class ShareLinkService {
  constructor(
    private readonly reader: SupabaseShareLinkRepository,
    private readonly writer: SupabaseShareLinkRepository
  ) {}

  async isInstalled(): Promise<boolean> {
    if (installed && installed.until > Date.now()) return installed.value;
    const value = await this.reader.probe().catch(() => false);
    installed = { value, until: Date.now() + (value ? INSTALLED_TTL_MS : NOT_INSTALLED_TTL_MS) };
    return value;
  }

  /** The link with this token and its delivery. Throws when share_links can't be read. */
  findByToken(token: string): Promise<{ link: ShareLink; delivery: Delivery } | null> {
    return this.reader.findByTokenWithDelivery(token);
  }

  findByIdWithDelivery(id: string): Promise<{ link: ShareLink; delivery: Delivery } | null> {
    return this.reader.findByIdWithDelivery(id);
  }

  findById(id: string): Promise<ShareLink | null> {
    return this.reader.findById(id);
  }

  listForDelivery(deliveryId: string): Promise<ShareLink[]> {
    return this.reader.listByDelivery(deliveryId);
  }

  listForWorkspace(workspaceId: string): Promise<WorkspaceShareLink[]> {
    return this.reader.listByWorkspace(workspaceId);
  }

  countUnrevoked(deliveryId: string): Promise<number> {
    return this.reader.countUnrevokedByDelivery(deliveryId);
  }

  create(dto: CreateShareLinkDTO): Promise<ShareLink> {
    return this.writer.create({ ...dto, label: dto.label.trim() });
  }

  update(link: ShareLink, patch: UpdateShareLinkDTO): Promise<ShareLink> {
    if (patch.revokedAt && link.isPrimary) throw new Error(PRIMARY_LINK_REFUSAL);
    return this.writer.update(link.id, patch.label !== undefined ? { ...patch, label: patch.label.trim() } : patch);
  }

  revoke(link: ShareLink): Promise<ShareLink> {
    if (link.isPrimary) throw new Error(PRIMARY_LINK_REFUSAL);
    return this.writer.update(link.id, { revokedAt: new Date().toISOString() });
  }

  restore(link: ShareLink): Promise<ShareLink> {
    return this.writer.update(link.id, { revokedAt: null });
  }

  async remove(link: ShareLink): Promise<void> {
    if (link.isPrimary) throw new Error(PRIMARY_LINK_REFUSAL);
    await this.writer.delete(link.id);
  }

  /** A new URL for the link. Everyone with the old one loses access (their unlock cookie too). */
  regenerateToken(link: ShareLink): Promise<ShareLink> {
    return this.writer.update(link.id, { token: newShareLinkToken() });
  }

  async makePrimary(link: ShareLink): Promise<void> {
    if (link.revokedAt) throw new Error("A link that's turned off can't be the main link. Turn it back on first.");
    if (link.isPrimary) return;
    await this.writer.setPrimary(link.id);
  }

  /** Several of a workspace's links at once (the Links page's bulk actions). The primary links can't be revoked. */
  updateMany(workspaceId: string, links: ShareLink[], patch: UpdateShareLinkDTO): Promise<number> {
    const targets = patch.revokedAt ? links.filter((link) => !link.isPrimary) : links;
    return this.writer.updateMany(
      workspaceId,
      targets.map((link) => link.id),
      patch
    );
  }

  recordEvent(
    link: ShareLink,
    kind: ShareLinkEventKind,
    details: { assetId?: string | null; visitor?: string | null; country?: string | null } = {}
  ): Promise<{ recorded: boolean; firstOpen: boolean }> {
    return this.writer.recordEvent(link.id, kind, details);
  }

  listEvents(linkId: string, limit?: number): Promise<ShareLinkEvent[]> {
    return this.reader.listEvents(linkId, limit);
  }
}
