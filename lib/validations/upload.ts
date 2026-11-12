import { z } from "zod";
import type { AssetType } from "@/core/entities/asset";
import { isUuid } from "@/lib/storage/keys";
import { uuidSchema } from "./common";

/**
 * What files can be uploaded, and how big.
 *
 * The server decides the stored content type from this allowlist (by extension), signs it
 * into the presigned upload, and checks the uploaded object against it before the file is
 * shown to anyone: HeadObject (size and type) and the first bytes (a real video or image,
 * not HTML, SVG or a script). Shared with the browser uploaders so they can refuse a file
 * before uploading it. Pure, safe in the browser.
 */

/** A single presigned PUT carries at most 5 GiB (R2's single-part limit). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

/** How long a presigned upload URL stays valid. The upload must start within it. */
export const UPLOAD_URL_TTL_SECONDS = 15 * 60;

interface UploadFileType {
  /** Content type the file is stored and served with. */
  contentType: string;
  /** Other types browsers report for the same files. */
  aliases?: readonly string[];
}

const VIDEO_FILE_TYPES: Readonly<Record<string, UploadFileType>> = {
  mp4: { contentType: "video/mp4", aliases: ["application/mp4"] },
  mov: { contentType: "video/quicktime", aliases: ["video/mov", "video/x-quicktime"] },
  m4v: { contentType: "video/x-m4v", aliases: ["video/mp4", "video/m4v"] },
  webm: { contentType: "video/webm" },
  mkv: { contentType: "video/x-matroska", aliases: ["video/mkv", "video/matroska", "application/x-matroska"] },
  mxf: { contentType: "application/mxf", aliases: ["video/mxf", "application/x-mxf"] },
  avi: { contentType: "video/x-msvideo", aliases: ["video/avi", "video/msvideo", "video/vnd.avi"] },
};

const PHOTO_FILE_TYPES: Readonly<Record<string, UploadFileType>> = {
  jpg: { contentType: "image/jpeg", aliases: ["image/jpg", "image/pjpeg"] },
  jpeg: { contentType: "image/jpeg", aliases: ["image/jpg", "image/pjpeg"] },
  png: { contentType: "image/png", aliases: ["image/x-png"] },
  webp: { contentType: "image/webp" },
  avif: { contentType: "image/avif" },
  heic: { contentType: "image/heic", aliases: ["image/heic-sequence", "image/heif"] },
  heif: { contentType: "image/heif", aliases: ["image/heif-sequence", "image/heic"] },
  tif: { contentType: "image/tiff", aliases: ["image/tif", "image/x-tiff"] },
  tiff: { contentType: "image/tiff", aliases: ["image/tif", "image/x-tiff"] },
  gif: { contentType: "image/gif" },
};

/** Allowed extensions (lowercase, no dot) and their stored content types, per asset type. */
export const UPLOAD_FILE_TYPES: Readonly<Record<AssetType, Readonly<Record<string, UploadFileType>>>> = {
  video: VIDEO_FILE_TYPES,
  photo_gallery: PHOTO_FILE_TYPES,
};

/** Browsers send these when they don't know a file's type; the extension decides then. */
const UNKNOWN_DECLARED_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream"]);

const VIDEO_LABEL = "MP4, MOV, M4V, WebM, MKV, MXF or AVI";
const PHOTO_LABEL = "JPG, PNG, WebP, AVIF, HEIC, TIFF or GIF";

/** `accept` attribute for file pickers. */
export const UPLOAD_ACCEPT = [
  ...Object.keys(VIDEO_FILE_TYPES),
  ...Object.keys(PHOTO_FILE_TYPES),
].map((ext) => `.${ext}`).concat(
  Array.from(new Set([...Object.values(VIDEO_FILE_TYPES), ...Object.values(PHOTO_FILE_TYPES)].map((t) => t.contentType)))
).join(",");

/** Lowercase extension of a file name or object key, without the dot ("" when none). */
export function fileExtension(filename: string | null | undefined): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec((filename ?? "").trim().split(/[?#]/)[0]);
  return match ? match[1].toLowerCase() : "";
}

/** The asset type a file can be uploaded as, from its extension, or null when it isn't allowed. */
export function assetTypeForFile(filename: string): AssetType | null {
  const ext = fileExtension(filename);
  if (ext && Object.prototype.hasOwnProperty.call(VIDEO_FILE_TYPES, ext)) return "video";
  if (ext && Object.prototype.hasOwnProperty.call(PHOTO_FILE_TYPES, ext)) return "photo_gallery";
  return null;
}

function fileTypeFor(assetType: AssetType, ext: string): UploadFileType | null {
  const allowed = UPLOAD_FILE_TYPES[assetType];
  return allowed && ext && Object.prototype.hasOwnProperty.call(allowed, ext) ? allowed[ext] : null;
}

/** The content type an allowed file of this asset type is stored with, from its name or key. */
export function contentTypeForUpload(assetType: AssetType, filename: string | null | undefined): string | null {
  return fileTypeFor(assetType, fileExtension(filename))?.contentType ?? null;
}

// Both members declare every field: the project compiles without strictNullChecks, where
// narrowing on a boolean discriminant doesn't work.
export type UploadFileCheck =
  | { ok: true; extension: string; contentType: string; error?: undefined }
  | { ok: false; error: string; extension?: undefined; contentType?: undefined };

/**
 * Checks a file against the allowlist for an asset type: the extension must be allowed, the
 * type the browser declared (if any) must match it, and the size must fit one upload.
 */
export function checkUploadFile(file: {
  assetType: AssetType;
  filename: string;
  declaredType?: string | null;
  sizeBytes: number;
}): UploadFileCheck {
  const ext = fileExtension(file.filename);
  const type = fileTypeFor(file.assetType, ext);
  if (!type) {
    return {
      ok: false,
      error:
        file.assetType === "photo_gallery"
          ? `Photos must be ${PHOTO_LABEL} files.`
          : `Videos must be ${VIDEO_LABEL} files.`,
    };
  }

  const declared = (file.declaredType ?? "").split(";")[0].trim().toLowerCase();
  if (!UNKNOWN_DECLARED_TYPES.has(declared) && declared !== type.contentType && !type.aliases?.includes(declared)) {
    return { ok: false, error: `This file says it is ${declared}, which doesn't match its .${ext} extension.` };
  }

  if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes <= 0) {
    return { ok: false, error: "The file is empty." };
  }
  if (file.sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Files can be at most 5 GB." };
  }

  return { ok: true, extension: ext, contentType: type.contentType };
}

// ---------------------------------------------------------------------------
// Content sniffing: what the first bytes of an uploaded object really are.
// ---------------------------------------------------------------------------

export type SniffedMediaKind =
  | "mp4" // ISO base media (MP4, MOV, M4V) with a video brand
  | "quicktime" // QuickTime without an ftyp box
  | "matroska" // MKV, WebM
  | "avi"
  | "mxf"
  | "jpeg"
  | "png"
  | "gif"
  | "webp"
  | "tiff"
  | "heif"; // ISO base media with an image brand (HEIC, HEIF, AVIF)

/** How many leading bytes `sniffMediaKind` wants (MXF files may have a short run-in). */
export const SNIFF_BYTES = 8192;

const IMAGE_BRANDS = new Set(["avif", "avis", "heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs", "mif1", "msf1"]);
const QUICKTIME_ATOMS = new Set(["moov", "mdat", "wide", "free", "skip", "pnot", "uuid"]);
const MXF_PARTITION_KEY = [0x06, 0x0e, 0x2b, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0d, 0x01, 0x02];

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, i) => bytes[offset + i] === value);
}

function indexOfSignature(bytes: Uint8Array, signature: readonly number[]): number {
  for (let i = 0; i + signature.length <= bytes.length; i++) {
    if (startsWith(bytes, signature, i)) return i;
  }
  return -1;
}

/** The media format the bytes start with, or null for anything else (HTML, SVG, scripts, ...). */
export function sniffMediaKind(bytes: Uint8Array): SniffedMediaKind | null {
  if (!bytes || bytes.length < 12) return null;

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  const head6 = ascii(bytes, 0, 6);
  if (head6 === "GIF87a" || head6 === "GIF89a") return "gif";
  if (ascii(bytes, 0, 4) === "RIFF") {
    const form = ascii(bytes, 8, 12);
    if (form === "WEBP") return "webp";
    if (form === "AVI ") return "avi";
    return null;
  }
  if (
    startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a]) ||
    startsWith(bytes, [0x49, 0x49, 0x2b, 0x00]) ||
    startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2b])
  ) {
    return "tiff";
  }
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "matroska";

  const box = ascii(bytes, 4, 8);
  if (box === "ftyp") {
    return IMAGE_BRANDS.has(ascii(bytes, 8, 12).toLowerCase()) ? "heif" : "mp4";
  }
  if (QUICKTIME_ATOMS.has(box)) return "quicktime";

  // MXF: header partition pack, at the start or after a run-in of up to 64 KiB.
  if (indexOfSignature(bytes, MXF_PARTITION_KEY) !== -1) return "mxf";

  return null;
}

const VIDEO_KINDS = new Set<SniffedMediaKind>(["mp4", "quicktime", "matroska", "avi", "mxf"]);
const PHOTO_KINDS = new Set<SniffedMediaKind>(["jpeg", "png", "gif", "webp", "tiff", "heif"]);

/** True when the bytes are a real video (for video assets) or image (for photo assets). */
export function bytesMatchAssetType(bytes: Uint8Array, assetType: AssetType): boolean {
  const kind = sniffMediaKind(bytes);
  if (!kind) return false;
  return assetType === "photo_gallery" ? PHOTO_KINDS.has(kind) : VIDEO_KINDS.has(kind);
}

// ---------------------------------------------------------------------------
// Server action input
// ---------------------------------------------------------------------------

export const assetTypeSchema = z.enum([
  "video",
  "photo_gallery",
]);

/**
 * Which flow an upload outside a delivery comes from. Decides the object's key prefix, and
 * only "portfolio" (the upload film/still flow, stored under portfolio/standalone/) makes the
 * new file a standalone piece on the public portfolio. Uploads to a delivery ignore it: they
 * are always private and never portfolio pieces. Unset: a public file that isn't a portfolio piece.
 *
 *   portfolio  standalone portfolio film or still    portfolio/standalone/<films|stills>/...
 *   project    media of a showcase project           portfolio/projects/<films|stills>/...
 *   cover      a showcase project's cover image      portfolio/covers/...
 *   hero       portfolio hero video or image         portfolio/hero/...
 *   branding   logo and other branding images        branding/...
 */
export const uploadPlacementSchema = z.enum(["portfolio", "project", "cover", "hero", "branding"]);

export type UploadPlacement = z.infer<typeof uploadPlacementSchema>;

/** True only for standalone portfolio pieces. Never for uploads into a delivery. */
export function isStandalonePortfolioUpload(placement: UploadPlacement | null | undefined, deliveryId: string | null | undefined): boolean {
  return !deliveryId && placement === "portfolio";
}

const optionalIdSchema = (message: string) =>
  z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null))
    .refine((val) => val === null || isUuid(val), message);

export const requestUploadSchema = z.object({
  workspaceId: uuidSchema,
  /** The delivery the file goes into; empty for a portfolio or branding upload. */
  projectId: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  /** Upload a new version of this file instead of creating a new one. */
  assetId: optionalIdSchema("Invalid file id."),
  title: z
    .string()
    .trim()
    .min(1, "Asset title is required")
    .max(255, "Asset title cannot exceed 255 characters"),
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename is too long"),
  fileSizeBytes: z
    .number()
    .int("File size must be a whole number of bytes")
    .positive("The file is empty")
    .max(MAX_UPLOAD_BYTES, "Files can be at most 5 GB"),
  /** The type the browser reports for the file (File.type); must match the extension. */
  contentType: z.string().trim().max(255).optional().nullable(),
  assetType: assetTypeSchema.default("video"),
  aspectRatio: z.string().trim().max(32).optional(),
  maxDurationSeconds: z.number().int().positive().max(21600).optional(),
  /** For uploads outside a delivery: which flow it comes from (see uploadPlacementSchema). */
  placement: uploadPlacementSchema.optional(),
});

export type RequestUploadInput = z.input<typeof requestUploadSchema>;

/** Confirming takes only the version: where the file is stored was decided at request time. */
export const confirmUploadSchema = z.object({
  assetVersionId: uuidSchema,
});

export type ConfirmUploadInput = z.input<typeof confirmUploadSchema>;
