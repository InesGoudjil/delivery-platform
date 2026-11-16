import { createHash, createHmac, timingSafeEqual } from "crypto";
import { derivedKey } from "./derived-key";

/**
 * Download tickets: what a client-room guest's download buttons point at
 * (/api/links/dl/<ticket>/<filename>), instead of a storage URL that works for hours.
 *
 * A ticket names one file version through one share link, until a time (24 hours at most, never
 * past the link's expiry). It's signed over the link's current token and passcode hash, so a new
 * URL or passcode cancels every ticket. The route checks the link on every use, so turning the
 * link off, or its downloads, stops downloads on the next click; each use is counted.
 *
 * Tickets work without the room's unlock cookie, so download managers (FDM, IDM) and resumed
 * downloads work, also for passcode links: holding a ticket means having been let in.
 */

const VERSION = "v1";
export const DOWNLOAD_TICKET_TTL_SECONDS = 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TicketLink {
  id: string;
  token: string;
  passcodeHash?: string | null;
  expiresAt?: string | null;
}

export interface ParsedDownloadTicket {
  linkId: string;
  versionId: string;
  expiresAt: number;
  mac: Buffer;
}

function fingerprint(link: TicketLink): string {
  return createHash("sha256").update(`${link.id}\n${link.token}\n${link.passcodeHash ?? ""}`).digest("base64url");
}

function sign(linkId: string, versionId: string, expiresAt: number, link: TicketLink): Buffer {
  return createHmac("sha256", derivedKey("cut:share-link-download:v1"))
    .update(`${VERSION}.${linkId}.${versionId}.${expiresAt}.${fingerprint(link)}`)
    .digest();
}

/** "v1.<link id>.<version id>.<unix expiry>.<base64url HMAC>" */
export function createDownloadTicket(link: TicketLink, versionId: string, now: number = Date.now()): string {
  let expiresAt = Math.floor(now / 1000) + DOWNLOAD_TICKET_TTL_SECONDS;
  if (link.expiresAt) expiresAt = Math.min(expiresAt, Math.floor(new Date(link.expiresAt).getTime() / 1000));
  return `${VERSION}.${link.id}.${versionId}.${expiresAt}.${sign(link.id, versionId, expiresAt, link).toString("base64url")}`;
}

/** The ticket's parts when it's well formed and not expired, else null. Checks no signature yet. */
export function parseDownloadTicket(value: string | null | undefined, now: number = Date.now()): ParsedDownloadTicket | null {
  if (!value || typeof value !== "string" || value.length > 300) return null;
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== VERSION) return null;
  const [, linkId, versionId, rawExpiry, rawMac] = parts;
  if (!UUID.test(linkId) || !UUID.test(versionId)) return null;
  const expiresAt = Number(rawExpiry);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= now) return null;
  // Never accept a ticket that claims to outlive the maximum lifetime.
  if (expiresAt * 1000 > now + (DOWNLOAD_TICKET_TTL_SECONDS + 300) * 1000) return null;
  const mac = Buffer.from(rawMac, "base64url");
  if (mac.length !== 32) return null;
  return { linkId, versionId, expiresAt, mac };
}

/** True when the ticket was made for this link as it is now (same token and passcode). */
export function verifyDownloadTicket(ticket: ParsedDownloadTicket, link: TicketLink): boolean {
  if (ticket.linkId !== link.id) return false;
  const expected = sign(ticket.linkId, ticket.versionId, ticket.expiresAt, link);
  return expected.length === ticket.mac.length && timingSafeEqual(expected, ticket.mac);
}

/** The guest-facing download URL for a version; ends with the file name, so its extension shows. */
export function downloadTicketPath(link: TicketLink, versionId: string, filename: string): string {
  return `/api/links/dl/${createDownloadTicket(link, versionId)}/${encodeURIComponent(filename)}`;
}
