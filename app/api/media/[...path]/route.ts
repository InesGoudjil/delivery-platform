import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerServices, getServerAdminServices } from "@/core/server";
import { getClientRoom } from "@/core/security/client-room";
import { env } from "@/lib/env";
import { isStreamUid, parseStoredMedia } from "@/lib/storage/keys";
import { createScopedLogger } from "@/lib/logger";

/**
 * GET /api/media/<R2 key | Stream UID>[?download=true&filename=…][&room=<share token>]
 *
 * - Public R2 objects: redirect to the public CDN, or to a signed attachment URL.
 * - Private R2 objects: a signed-in member of the key's workspace; or, with `room=`, a
 *   client-room visitor the room gate lets in, for that delivery's files only and only
 *   when the studio turned downloads on (the room page signs what it displays itself).
 * - Stream videos: thumbnails redirect to Stream. MP4 downloads need the same access as
 *   private files, checked against the file whose (server-written) row holds the UID.
 *
 * Passcodes are never accepted in the URL: the room's unlock cookie is the only proof.
 */

const log = createScopedLogger({ route: "api/media" });

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" fill="none">
  <rect width="1280" height="720" fill="#0e0e11"/>
  <rect x="0.5" y="0.5" width="1279" height="719" stroke="#ffffff" stroke-opacity="0.08"/>
  <g transform="translate(608, 328)">
    <circle cx="32" cy="32" r="32" fill="#18181b" stroke="#ffffff" stroke-opacity="0.12"/>
    <path d="M26 20L44 32L26 44V20Z" fill="#f5551d"/>
  </g>
  <text x="640" y="405" text-anchor="middle" fill="#71717a" font-family="system-ui, sans-serif" font-size="14" font-weight="600" letter-spacing="1">CINESPACE MEDIA</text>
</svg>`;

const SAFE_HEADERS = { "X-Content-Type-Options": "nosniff" } as const;

function createFallbackResponse() {
  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      ...SAFE_HEADERS,
      "Content-Type": "image/svg+xml",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

function unauthorized() {
  return new NextResponse("Unauthorized access to private media", {
    status: 401,
    headers: { ...SAFE_HEADERS, "Cache-Control": "private, no-store" },
  });
}

/** A redirect to a short-lived signed URL: never cached by shared caches. */
function signedRedirect(url: string) {
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Content-Type-Options", "nosniff");
  return res;
}

/** Content types the dev proxy may serve inline from the app's own origin. */
const INLINE_TYPES = /^(image\/(avif|webp|png|jpeg|gif)|video\/|audio\/|application\/x-mpegURL$|video\/MP2T$)/;

function getContentType(key: string, s3ContentType?: string): string {
  const lowerKey = key.toLowerCase();
  if (lowerKey.endsWith(".avif")) return "image/avif";
  if (lowerKey.endsWith(".webp")) return "image/webp";
  if (lowerKey.endsWith(".png")) return "image/png";
  if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) return "image/jpeg";
  if (lowerKey.endsWith(".gif")) return "image/gif";
  if (lowerKey.endsWith(".mp4")) return "video/mp4";
  if (lowerKey.endsWith(".mov")) return "video/quicktime";
  if (lowerKey.endsWith(".webm")) return "video/webm";
  if (lowerKey.endsWith(".m3u8")) return "application/x-mpegURL";
  if (lowerKey.endsWith(".ts")) return "video/MP2T";
  if (lowerKey.endsWith(".mp3")) return "audio/mpeg";
  if (lowerKey.endsWith(".wav")) return "audio/wav";
  return s3ContentType && s3ContentType !== "application/octet-stream" ? s3ContentType : "application/octet-stream";
}

async function isWorkspaceMember(workspaceId: string | null): Promise<boolean> {
  if (!workspaceId) return false;
  try {
    const services = await getServerServices();
    const user = await services.auth.getCurrentUser();
    if (!user) return false;
    return Boolean(await services.member.getMember(workspaceId, user.id));
  } catch {
    return false;
  }
}

/** A client-room visitor who may download this delivery's files. */
async function roomAllowsDownload(roomToken: string | null, workspaceId: string | null, deliveryId: string | null) {
  if (!roomToken || !workspaceId || !deliveryId) return false;
  const room = await getClientRoom(roomToken);
  return Boolean(
    room?.canDownload && room.delivery.id === deliveryId && room.delivery.workspaceId === workspaceId
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  let key = pathSegments
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join("/");

  if (key === "placeholder.svg" || key === "fallback.svg") {
    return createFallbackResponse();
  }

  const downloadParam = req.nextUrl.searchParams.get("download");
  const filenameParam = req.nextUrl.searchParams.get("filename");
  const roomToken = req.nextUrl.searchParams.get("room");
  const isDownload =
    downloadParam === "true" || (Boolean(downloadParam) && downloadParam !== "false") || Boolean(filenameParam);
  const rawFilename =
    filenameParam ||
    (downloadParam && downloadParam !== "true" && downloadParam !== "false" ? downloadParam : null) ||
    key.split("/").pop() ||
    "download";
  const safeFilename = rawFilename.replace(/[/\\?%*:|"<>\r\n]/g, "_").trim().slice(0, 180) || "download";
  const cleanAscii = safeFilename.replace(/[^\x20-\x7e]/g, "_");

  // 1. Cloudflare Stream video
  if (isStreamUid(key)) {
    const uid = key.toLowerCase();
    const streamDomain = (env.CLOUDFLARE_STREAM_SUBDOMAIN || "videodelivery.net")
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (!isDownload) {
      return NextResponse.redirect(`https://${streamDomain}/${uid}/thumbnails/thumbnail.jpg?time=1s&height=720`, 307);
    }

    // Downloads: only for the members of the file's workspace, or its client room.
    const admin = await getServerAdminServices();
    const asset = await admin.asset.findAssetByStreamUid(uid).catch(() => null);
    const allowed =
      asset !== null &&
      !asset.isArchived &&
      ((await isWorkspaceMember(asset.workspaceId)) ||
        (await roomAllowsDownload(roomToken, asset.workspaceId, asset.deliveryId ?? null)));
    if (!allowed) return unauthorized();

    let mp4Url = `https://${streamDomain}/${uid}/downloads/default.mp4`;
    const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN;

    // MP4 downloads are off by default on Stream (404 until enabled).
    if (cfAccountId && cfApiToken) {
      const downloadsEndpoint = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${uid}/downloads`;
      try {
        let cfRes = await fetch(downloadsEndpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${cfApiToken}`, "Content-Type": "application/json" },
        });
        if (!cfRes.ok) {
          cfRes = await fetch(downloadsEndpoint, { method: "GET", headers: { Authorization: `Bearer ${cfApiToken}` } });
        }
        if (cfRes.ok) {
          let cfJson = await cfRes.json();
          let defaultDl = cfJson?.result?.default;
          if (defaultDl?.url) mp4Url = defaultDl.url;
          let status: string | undefined = defaultDl?.status;

          // Stream may still be generating the MP4: wait up to 15 s.
          const deadline = Date.now() + 15000;
          while (Date.now() < deadline && status && status !== "ready" && status !== "error") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const pollRes = await fetch(downloadsEndpoint, {
              method: "GET",
              headers: { Authorization: `Bearer ${cfApiToken}` },
            });
            if (!pollRes.ok) break;
            cfJson = await pollRes.json();
            defaultDl = cfJson?.result?.default;
            if (defaultDl?.url) mp4Url = defaultDl.url;
            status = defaultDl?.status;
          }
        }
      } catch (err) {
        log.warn({ err }, "Failed to enable Cloudflare Stream MP4 download");
      }
    }

    // Stream appends `.mp4` to `?filename=` and wants letters, digits, _ and - only.
    const streamBaseFilename =
      cleanAscii
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 100) || "Deliverable";
    const separator = mp4Url.includes("?") ? "&" : "?";
    return signedRedirect(`${mp4Url}${separator}filename=${encodeURIComponent(streamBaseFilename)}`);
  }

  const publicBucket = env.CLOUDFLARE_R2_PUBLIC_BUCKET || env.CLOUDFLARE_R2_BUCKET;
  const privateBucket = env.CLOUDFLARE_R2_PRIVATE_BUCKET || env.CLOUDFLARE_R2_BUCKET;

  // Strip a bucket name prefix if the path includes it.
  if (publicBucket && key.startsWith(`${publicBucket}/`)) key = key.slice(publicBucket.length + 1);
  if (privateBucket && key.startsWith(`${privateBucket}/`)) key = key.slice(privateBucket.length + 1);

  const parsed = parseStoredMedia(key);
  if (!parsed || parsed.kind !== "r2") return createFallbackResponse();
  key = parsed.key;
  const isPrivate = parsed.visibility === "private";
  const targetBucket = isPrivate ? privateBucket : publicBucket || privateBucket;

  const r2PublicDomain = (env.CLOUDFLARE_R2_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN || "").replace(
    /\/+$/,
    ""
  );
  const hasRealR2PublicDomain =
    Boolean(r2PublicDomain) && !r2PublicDomain.includes("pub-xxxx") && !r2PublicDomain.includes("r2.cloudflarestorage.com");

  // 2. Public object, inline: straight to the public CDN.
  if (!isPrivate && !isDownload && hasRealR2PublicDomain) {
    return NextResponse.redirect(`${r2PublicDomain}/${key}`, 307);
  }

  // 3. Private object: decide access before signing anything.
  if (isPrivate) {
    const allowed =
      (await isWorkspaceMember(parsed.workspaceId)) ||
      (await roomAllowsDownload(roomToken, parsed.workspaceId, parsed.deliveryId));
    if (!allowed) return unauthorized();
  }

  if (!env.isCloudflareR2Configured) {
    if (!isPrivate && hasRealR2PublicDomain) return NextResponse.redirect(`${r2PublicDomain}/${key}`, 307);
    return createFallbackResponse();
  }

  try {
    const s3Client = new S3Client({
      region: "auto",
      endpoint: env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    const attachment = `attachment; filename="${cleanAscii}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;

    // 4. Private object, or a public download: a short-lived signed URL.
    if (isPrivate || isDownload) {
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: key,
        ...(isDownload ? { ResponseContentDisposition: attachment } : {}),
      });
      return signedRedirect(await getSignedUrl(s3Client, command, { expiresIn: 900 }));
    }

    // 5. Local development without a public domain: proxy public objects from the app's
    //    origin, inline only for media types, never sniffed.
    const rangeHeader = req.headers.get("range");
    const res = await s3Client.send(new GetObjectCommand({ Bucket: targetBucket, Key: key, Range: rangeHeader || undefined }));
    if (!res.Body) return createFallbackResponse();

    const contentType = getContentType(key, res.ContentType);
    const headers = new Headers(SAFE_HEADERS);
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    if (!INLINE_TYPES.test(contentType)) headers.set("Content-Disposition", attachment);
    if (res.ContentLength !== undefined) headers.set("Content-Length", res.ContentLength.toString());
    if (res.ContentRange) headers.set("Content-Range", res.ContentRange);
    if (res.ETag) headers.set("ETag", res.ETag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(res.Body.transformToWebStream(), {
      status: rangeHeader && res.ContentRange ? 206 : 200,
      headers,
    });
  } catch (err: unknown) {
    log.warn({ err }, "Error resolving R2 key");
    return createFallbackResponse();
  }
}
