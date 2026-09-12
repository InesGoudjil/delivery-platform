import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  let key = pathSegments.join("/");

  // Strip bucket name prefix if included in the path segments
  if (env.CLOUDFLARE_R2_BUCKET && key.startsWith(`${env.CLOUDFLARE_R2_BUCKET}/`)) {
    key = key.slice(env.CLOUDFLARE_R2_BUCKET.length + 1);
  }

  if (!env.isCloudflareR2Configured) {
    return NextResponse.redirect(
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80"
    );
  }

  try {
    const s3Client = new S3Client({
      region: "auto",
      endpoint: env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    const command = new GetObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET,
      Key: key,
    });

    const res = await s3Client.send(command);

    if (!res.Body) {
      return NextResponse.redirect(
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80"
      );
    }

    const stream = res.Body.transformToWebStream();

    const headers = new Headers();
    let contentType = res.ContentType;
    if (!contentType || contentType === "application/octet-stream") {
      const lowerKey = key.toLowerCase();
      if (lowerKey.endsWith(".avif")) contentType = "image/avif";
      else if (lowerKey.endsWith(".webp")) contentType = "image/webp";
      else if (lowerKey.endsWith(".png")) contentType = "image/png";
      else if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (lowerKey.endsWith(".mp4")) contentType = "video/mp4";
      else if (lowerKey.endsWith(".mov")) contentType = "video/quicktime";
      else if (lowerKey.endsWith(".webm")) contentType = "video/webm";
    }

    if (contentType) headers.set("Content-Type", contentType);
    if (res.ContentLength) headers.set("Content-Length", res.ContentLength.toString());
    if (res.ETag) headers.set("ETag", res.ETag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(stream, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error(`[Media Proxy] Error loading R2 key "${key}":`, err?.message || err);
    return NextResponse.redirect(
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80"
    );
  }
}
