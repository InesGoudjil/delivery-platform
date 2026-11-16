import { createHmac } from "crypto";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/upstash";
import { derivedKey } from "./derived-key";

/**
 * Who opened a share link, as far as link activity needs: a short keyed hash of the visitor's IP
 * and browser (tells repeat visits apart, says nothing about who), and the country the hosting
 * platform reports. No raw IP or user agent is kept. Read it while the request is still open.
 */
export async function shareLinkVisitor(): Promise<{ visitor: string | null; country: string | null }> {
  try {
    const headerList = await headers();
    const ip = await getClientIp();
    const userAgent = headerList.get("user-agent") || "";
    const visitor = createHmac("sha256", derivedKey("cut:share-link-visitor:v1"))
      .update(`${ip}\n${userAgent}`)
      .digest("base64url")
      .slice(0, 24);
    const rawCountry = (headerList.get("x-vercel-ip-country") || headerList.get("cf-ipcountry") || "").toUpperCase();
    return { visitor, country: /^[A-Z]{2}$/.test(rawCountry) && rawCountry !== "XX" ? rawCountry : null };
  } catch {
    return { visitor: null, country: null };
  }
}
