import { describe, it, expect } from "vitest";
import {
  DOWNLOAD_TICKET_TTL_SECONDS,
  createDownloadTicket,
  downloadTicketPath,
  parseDownloadTicket,
  verifyDownloadTicket,
} from "@/lib/security/download-ticket";

/** Download tickets: one file through one share link, for a while, signed over the link as it is. */

const link = {
  id: "c0000000-0000-4000-8000-0000000000a1",
  token: "agency-token-a-0001",
  passcodeHash: "scrypt$abc",
  expiresAt: null as string | null,
};
const VERSION = "50000000-0000-4000-8000-0000000000a1";

describe("lib/security/download-ticket", () => {
  it("is accepted for the link it was made for", () => {
    const ticket = parseDownloadTicket(createDownloadTicket(link, VERSION));
    expect(ticket).not.toBeNull();
    expect(ticket?.versionId).toBe(VERSION);
    expect(verifyDownloadTicket(ticket!, link)).toBe(true);
  });

  it("stops working when the link gets a new URL or passcode", () => {
    const ticket = parseDownloadTicket(createDownloadTicket(link, VERSION))!;
    expect(verifyDownloadTicket(ticket, { ...link, token: "agency-token-a-0002" })).toBe(false);
    expect(verifyDownloadTicket(ticket, { ...link, passcodeHash: "scrypt$new" })).toBe(false);
    expect(verifyDownloadTicket(ticket, { ...link, id: "c0000000-0000-4000-8000-0000000000b1" })).toBe(false);
  });

  it("refuses a tampered ticket", () => {
    const value = createDownloadTicket(link, VERSION);
    const otherVersion = value.replace(VERSION, "50000000-0000-4000-8000-0000000000b1");
    const parsed = parseDownloadTicket(otherVersion);
    expect(parsed && verifyDownloadTicket(parsed, link)).toBe(false);
    expect(parseDownloadTicket(value.slice(0, -4) + "AAAA")).not.toBeNull();
    expect(verifyDownloadTicket(parseDownloadTicket(value.slice(0, -4) + "AAAA")!, link)).toBe(false);
    expect(parseDownloadTicket("v1.not-a-uuid.x.1.y")).toBeNull();
    expect(parseDownloadTicket("")).toBeNull();
  });

  it("lasts a day at most, and never past the link's expiry", () => {
    const now = Date.now();
    const day = parseDownloadTicket(createDownloadTicket(link, VERSION, now), now)!;
    expect(day.expiresAt).toBe(Math.floor(now / 1000) + DOWNLOAD_TICKET_TTL_SECONDS);
    expect(parseDownloadTicket(createDownloadTicket(link, VERSION, now), now + (DOWNLOAD_TICKET_TTL_SECONDS + 1) * 1000)).toBeNull();

    const soon = { ...link, expiresAt: new Date(now + 60 * 60 * 1000).toISOString() };
    const capped = parseDownloadTicket(createDownloadTicket(soon, VERSION, now), now)!;
    expect(capped.expiresAt).toBe(Math.floor((now + 60 * 60 * 1000) / 1000));
  });

  it("ends with the file name, so the download keeps its extension", () => {
    expect(downloadTicketPath(link, VERSION, "Final Cut_V2.mov")).toMatch(/^\/api\/links\/dl\/v1\.[^/]+\/Final%20Cut_V2\.mov$/);
  });
});
