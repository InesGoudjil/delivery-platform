/**
 * What a stored media value points at, and which workspace owns it.
 *
 * File-location columns (asset_versions.raw_file_url, thumbnail_url, hls_manifest_url,
 * cover URLs, appearance JSON) hold one of:
 *   - an R2 object key: "private/workspaces/<workspaceId>/deliveries/<deliveryId>/...",
 *     "public/workspaces/<workspaceId>/portfolio/...", or a legacy "workspaces/<workspaceId>/..."
 *   - the same key inside a URL: a public-bucket URL, a presigned URL, or "/api/media/<key>"
 *   - a Cloudflare Stream video: a bare 32-hex UID, "/api/media/<uid>", or
 *     "https://<videodelivery.net | customer-*.cloudflarestream.com>/<uid>/..."
 *
 * For R2, the "workspaces/<workspaceId>/" prefix is the only proof of ownership, so server
 * code that signs, copies or deletes an object must check it with `isR2KeyInWorkspace`
 * first. Stream UIDs carry no owner: trust one only when it comes from a row the server
 * wrote for the same workspace.
 *
 * Pure functions, safe in the browser and on the server.
 */

export type StoredMedia =
  | { kind: "r2"; key: string; visibility: "public" | "private"; workspaceId: string | null; deliveryId: string | null }
  | { kind: "stream"; uid: string }
  | { kind: "other"; value: string };

const STREAM_UID = /^[a-f0-9]{32}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_IN_PATH = /((?:private\/|public\/)?workspaces\/[^?#\s]+)/;

export function isStreamUid(value: string | null | undefined): boolean {
  return typeof value === "string" && STREAM_UID.test(value);
}

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID.test(value);
}

function isStreamHost(host: string): boolean {
  const lower = host.toLowerCase();
  return lower === "videodelivery.net" || lower.endsWith(".videodelivery.net") || lower.endsWith(".cloudflarestream.com");
}

/** Rejects keys that could be read as paths into another prefix. */
function isCleanKey(key: string): boolean {
  if (!key || key.length > 1024) return false;
  if (key.includes("\\") || key.includes("//")) return false;
  return !key.split("/").some((segment) => segment === ".." || segment === ".");
}

function describeKey(rawKey: string): StoredMedia | null {
  let key = rawKey;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    // keep as-is
  }
  if (!isCleanKey(key)) return null;

  const match = key.match(/^(?:(private|public)\/)?workspaces\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, prefix, workspaceSegment, rest] = match;

  // Legacy keys without a privacy prefix are private when they sit under a delivery.
  const visibility: "public" | "private" =
    prefix === "public" ? "public" : prefix === "private" || rest.startsWith("deliveries/") ? "private" : "public";

  const deliveryMatch = rest.match(/^deliveries\/([^/]+)\//);
  return {
    kind: "r2",
    key,
    visibility,
    workspaceId: isUuid(workspaceSegment) ? workspaceSegment.toLowerCase() : null,
    deliveryId: deliveryMatch && isUuid(deliveryMatch[1]) ? deliveryMatch[1].toLowerCase() : null,
  };
}

/** Classifies a stored media value. Returns null for empty or unusable values. */
export function parseStoredMedia(value: string | null | undefined): StoredMedia | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isStreamUid(trimmed)) return { kind: "stream", uid: trimmed.toLowerCase() };

  const apiMedia = trimmed.match(/^\/api\/media\/([^?#]+)/);
  if (apiMedia) {
    const inner = apiMedia[1];
    if (isStreamUid(inner)) return { kind: "stream", uid: inner.toLowerCase() };
    return describeKey(inner) ?? { kind: "other", value: trimmed };
  }

  if (/^(?:private\/|public\/)?workspaces\//.test(trimmed)) {
    return describeKey(trimmed.split(/[?#]/)[0]) ?? { kind: "other", value: trimmed };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return { kind: "other", value: trimmed };
    }
    if (isStreamHost(url.hostname)) {
      const firstSegment = url.pathname.split("/").filter(Boolean)[0] ?? "";
      if (isStreamUid(firstSegment)) return { kind: "stream", uid: firstSegment.toLowerCase() };
      return { kind: "other", value: trimmed };
    }
    const inPath = url.pathname.replace(/^\/+/, "").match(KEY_IN_PATH);
    if (inPath) return describeKey(inPath[1]) ?? { kind: "other", value: trimmed };
  }

  return { kind: "other", value: trimmed };
}

/** The workspace id in an R2 key's "workspaces/<id>/" prefix, or null. */
export function r2KeyWorkspaceId(value: string | null | undefined): string | null {
  const parsed = parseStoredMedia(value);
  return parsed?.kind === "r2" ? parsed.workspaceId : null;
}

/** True when the value is an R2 object stored under the given workspace's prefix. */
export function isR2KeyInWorkspace(value: string | null | undefined, workspaceId: string | null | undefined): boolean {
  if (!workspaceId) return false;
  const parsed = parseStoredMedia(value);
  return parsed?.kind === "r2" && parsed.workspaceId !== null && parsed.workspaceId === workspaceId.toLowerCase();
}

/** The Stream UID a value points at, or null. */
export function streamUidOf(value: string | null | undefined): string | null {
  const parsed = parseStoredMedia(value);
  return parsed?.kind === "stream" ? parsed.uid : null;
}
