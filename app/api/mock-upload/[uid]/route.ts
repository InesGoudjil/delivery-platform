import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  return NextResponse.json({
    success: true,
    uid,
    message: "Mock direct upload received successfully.",
  });
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
