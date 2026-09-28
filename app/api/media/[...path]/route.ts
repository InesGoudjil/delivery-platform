import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerServices } from "@/core/server";
import { env } from "@/lib/env";

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" fill="none">
  <rect width="1280" height="720" fill="#0e0e11"/>
  <rect x="0.5" y="0.5" width="1279" height="719" stroke="#ffffff" stroke-opacity="0.08"/>
  <g transform="translate(608, 328)">
    <circle cx="32" cy="32" r="32" fill="#18181b" stroke="#ffffff" stroke-opacity="0.12"/>
    <path d="M26 20L44 32L26 44V20Z" fill="#f5551d"/>
  </g>
  <text x="640" y="405" text-anchor="middle" fill="#71717a" font-family="system-ui, sans-serif" font-size="14" font-weight="600" letter-spacing="1">CINESPACE MEDIA</text>
</svg>`;

function createFallbackResponse() {
  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

function getContentType(key: string, s3ContentType?: string): string {
  if (s3ContentType && s3ContentType !== "application/octet-stream") {
    return s3ContentType;
  }
  const lowerKey = key.toLowerCase();
  if (lowerKey.endsWith(".avif")) return "image/avif";
  if (lowerKey.endsWith(".webp")) return "image/webp";
  if (lowerKey.endsWith(".png")) return "image/png";
  if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) return "image/jpeg";
  if (lowerKey.endsWith(".gif")) return "image/gif";
  if (lowerKey.endsWith(".svg")) return "image/svg+xml";
  if (lowerKey.endsWith(".mp4")) return "video/mp4";
  if (lowerKey.endsWith(".mov")) return "video/quicktime";
  if (lowerKey.endsWith(".webm")) return "video/webm";
  if (lowerKey.endsWith(".m3u8")) return "application/x-mpegURL";
  if (lowerKey.endsWith(".ts")) return "video/MP2T";
  if (lowerKey.endsWith(".mp3")) return "audio/mpeg";
  if (lowerKey.endsWith(".wav")) return "audio/wav";
  return s3ContentType || "application/octet-stream";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  let key = pathSegments.join("/");

  if (key === "placeholder.svg" || key === "fallback.svg") {
    return createFallbackResponse();
  }

  // 1. If key is a 32-char hex Cloudflare Stream UID, route directly to Stream thumbnail or video
  if (/^[a-f0-9]{32}$/i.test(key)) {
    const streamDomain = (env.CLOUDFLARE_STREAM_SUBDOMAIN || "videodelivery.net")
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    return NextResponse.redirect(
      `https://${streamDomain}/${key}/thumbnails/thumbnail.jpg?time=1s&height=720`,
      307
    );
  }

  const publicBucket = env.CLOUDFLARE_R2_PUBLIC_BUCKET || env.CLOUDFLARE_R2_BUCKET;
  const privateBucket = env.CLOUDFLARE_R2_PRIVATE_BUCKET || env.CLOUDFLARE_R2_BUCKET;

  // Strip bucket name prefix if included in the path segments
  if (publicBucket && key.startsWith(`${publicBucket}/`)) {
    key = key.slice(publicBucket.length + 1);
  }
  if (privateBucket && key.startsWith(`${privateBucket}/`)) {
    key = key.slice(privateBucket.length + 1);
  }

  const isPrivate = key.startsWith("private/");
  const targetBucket = isPrivate ? privateBucket : (publicBucket || privateBucket);

  const r2PublicDomain = (
    env.CLOUDFLARE_R2_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN ||
    ""
  ).replace(/\/+$/, "");

  const hasRealR2PublicDomain =
    Boolean(r2PublicDomain) &&
    !r2PublicDomain.includes("pub-xxxx") &&
    !r2PublicDomain.includes("r2.cloudflarestorage.com");

  // 2. Public Asset Direct CDN Offload:
  // If the asset is public and a valid public domain is configured, issue an immediate 307 redirect
  if (!isPrivate && hasRealR2PublicDomain) {
    return NextResponse.redirect(`${r2PublicDomain}/${key}`, 307);
  }

  if (!env.isCloudflareR2Configured) {
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

    // 3. Private Asset Gated Dispatcher:
    // Enforce workspace membership OR delivery passcode authorization before generating a presigned GET URL.
    if (isPrivate) {
      let isAuthorized = false;

      try {
        const services = await getServerServices();
        const user = await services.auth.getCurrentUser();

        // Extract workspaceId and deliveryId from key: private/workspaces/{workspaceId}/...
        const segments = key.split("/");
        const workspaceId = segments[1] === "workspaces" ? segments[2] : null;
        const deliveryId = segments[3] === "deliveries" ? segments[4] : (segments[3] && segments[3] !== "standalone" ? segments[3] : null);

        // A. Workspace member check (creators and authorized team members)
        if (user && workspaceId) {
          const isMember = await services.member.isMember(workspaceId, user.id).catch(() => false);
          if (isMember) {
            isAuthorized = true;
          }
        }

        // B. Client Delivery check (verified cookie or public/passcode access)
        if (!isAuthorized && deliveryId) {
          const delivery = await services.delivery.getDeliveryById(deliveryId);
          if (delivery) {
            if (!delivery.passcodeHash) {
              // Unprotected public delivery cut
              isAuthorized = true;
            } else {
              // Check client verified cookie
              const accessCookie = req.cookies.get(`delivery_access_${delivery.shareToken}`)?.value;
              if (accessCookie === "verified") {
                isAuthorized = true;
              } else {
                // Check query params (?passphrase=... or ?code=...)
                const queryCode = (req.nextUrl.searchParams.get("passphrase") || req.nextUrl.searchParams.get("code"))?.trim();
                if (queryCode) {
                  const hashed = createHash("sha256").update(queryCode).digest("hex");
                  if (delivery.passcodeHash === queryCode || delivery.passcodeHash === hashed) {
                    isAuthorized = true;
                  }
                }
              }
            }
          }
        }
      } catch (authErr) {
        console.warn("[Media Proxy Auth] Error checking media authorization:", authErr);
      }

      if (!isAuthorized) {
        return new NextResponse("Unauthorized access to private media", { status: 401 });
      }

      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      return NextResponse.redirect(presignedUrl, 307);
    }

    // 4. Fallback direct proxy (only reached in local development without public domain)
    const rangeHeader = req.headers.get("range");

    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Range: rangeHeader || undefined,
    });

    const res = await s3Client.send(command);

    if (!res.Body) {
      return createFallbackResponse();
    }

    const stream = res.Body.transformToWebStream();
    const contentType = getContentType(key, res.ContentType);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");

    if (res.ContentLength !== undefined) {
      headers.set("Content-Length", res.ContentLength.toString());
    }
    if (res.ContentRange) {
      headers.set("Content-Range", res.ContentRange);
    }
    if (res.ETag) {
      headers.set("ETag", res.ETag);
    }

    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    const status = rangeHeader && res.ContentRange ? 206 : 200;

    return new NextResponse(stream, {
      status,
      headers,
    });
  } catch (err: any) {
    console.warn(`[Media Proxy] Error resolving R2 key "${key}":`, err?.message || err);
    return createFallbackResponse();
  }
}
