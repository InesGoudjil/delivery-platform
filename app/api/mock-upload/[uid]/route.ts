import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MOCK_STORAGE_DIR = "/tmp/cut-mock-uploads";

declare global {
  // eslint-disable-next-line no-var
  var __mockUploadStore: Map<string, { buffer: Buffer; contentType: string }> | undefined;
}

const memoryStore =
  globalThis.__mockUploadStore ||
  (globalThis.__mockUploadStore = new Map<string, { buffer: Buffer; contentType: string }>());

async function saveUploadedBuffer(uid: string, buffer: Buffer, contentType: string) {
  memoryStore.set(uid, { buffer, contentType });
  try {
    await fs.mkdir(MOCK_STORAGE_DIR, { recursive: true });
    const filePath = path.join(MOCK_STORAGE_DIR, uid);
    const metaPath = path.join(MOCK_STORAGE_DIR, `${uid}.meta.json`);
    await fs.writeFile(filePath, buffer);
    await fs.writeFile(metaPath, JSON.stringify({ contentType, createdAt: Date.now() }));
  } catch (err) {
    console.error("Error persisting mock file to disk:", err);
  }
}

async function getUploadedBuffer(uid: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const inMemory = memoryStore.get(uid);
  if (inMemory) return inMemory;

  try {
    const filePath = path.join(MOCK_STORAGE_DIR, uid);
    const metaPath = path.join(MOCK_STORAGE_DIR, `${uid}.meta.json`);
    const buffer = await fs.readFile(filePath);
    let contentType = "image/jpeg";
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      // Fallback
    }
    const item = { buffer, contentType };
    memoryStore.set(uid, item);
    return item;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const stored = await getUploadedBuffer(uid);

  if (stored && stored.buffer && stored.buffer.length > 0) {
    return new NextResponse(new Uint8Array(stored.buffer), {
      headers: {
        "Content-Type": stored.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const rangeHeader = req.headers.get("range");
  const acceptHeader = req.headers.get("accept") || "";
  const isVideoPlaybackRequest =
    Boolean(rangeHeader) ||
    acceptHeader.includes("video") ||
    req.nextUrl.searchParams.get("type") === "video" ||
    req.nextUrl.searchParams.has("video");

  if (isVideoPlaybackRequest) {
    // If explicitly requested by a video player with byte ranges or video Accept
    return NextResponse.redirect(
      "https://files.vidstack.io/sprite-fight/720p.mp4",
      307
    );
  }

  // By default (Next.js image optimizer, browser thumbnails, img tags):
  // Return the SVG placeholder directly with 200 OK so Next.js never sees an empty 307
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" fill="none">
    <rect width="1280" height="720" fill="#0e0e11"/>
    <rect x="0.5" y="0.5" width="1279" height="719" stroke="#ffffff" stroke-opacity="0.08"/>
    <g transform="translate(608, 328)">
      <circle cx="32" cy="32" r="32" fill="#18181b" stroke="#ffffff" stroke-opacity="0.12"/>
      <path d="M26 20L44 32L26 44V20Z" fill="#f5551d"/>
    </g>
    <text x="640" y="405" text-anchor="middle" fill="#71717a" font-family="system-ui, sans-serif" font-size="14" font-weight="600" letter-spacing="1">MOCK MEDIA PREVIEW</text>
  </svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let detectedType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        buffer = Buffer.from(await file.arrayBuffer());
        detectedType = file.type || "image/jpeg";
      }
    }

    if (!buffer) {
      buffer = Buffer.from(await req.arrayBuffer());
      detectedType = contentType.split(";")[0] || "image/jpeg";
    }

    if (buffer && buffer.length > 0) {
      await saveUploadedBuffer(uid, buffer, detectedType);
    }
  } catch (err) {
    console.error("Failed to parse POST upload body:", err);
  }

  return NextResponse.json({
    success: true,
    uid,
    message: "Mock direct upload received successfully.",
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  try {
    const contentType = req.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer && buffer.length > 0) {
      await saveUploadedBuffer(uid, buffer, contentType);
    }
  } catch (err) {
    console.error("Failed to save PUT uploaded file:", err);
  }

  return new NextResponse(null, { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Upload-Offset": req.headers.get("Upload-Length") || "104857600",
    },
  });
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Upload-Offset": "0",
      "Upload-Length": "5368709120",
    },
  });
}
