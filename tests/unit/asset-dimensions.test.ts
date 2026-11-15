import { describe, it, expect } from "vitest";
import { aspectRatioValueFromDimensions, isSameAspectRatio } from "@/lib/media-ratios";
import { requestUploadSchema } from "@/lib/validations/upload";
import { SupabaseAssetVersionRepository } from "@/core/repositories/asset.repository";

describe("shape helpers", () => {
  it("stores a size as the nearest preset, or its decimal form", () => {
    expect(aspectRatioValueFromDimensions(1920, 1080)).toBe("16:9");
    expect(aspectRatioValueFromDimensions(1080, 1920)).toBe("9:16");
    expect(aspectRatioValueFromDimensions(3840, 1608)).toBe("2.39:1");
    expect(aspectRatioValueFromDimensions(1000, 811)).toBe("1.233 / 1");
  });

  it("compares shapes within the detection tolerance", () => {
    expect(isSameAspectRatio("16:9", "1920:1080")).toBe(true);
    expect(isSameAspectRatio("16:9", "1.75")).toBe(true);
    expect(isSameAspectRatio("16:9", "9:16")).toBe(false);
    expect(isSameAspectRatio("16:9", null)).toBe(false);
  });
});

describe("upload request size", () => {
  const valid = {
    workspaceId: "10000000-0000-4000-8000-00000000000a",
    title: "Cut",
    filename: "cut.mp4",
    fileSizeBytes: 1024,
  };

  it("accepts a pixel size in whole, positive numbers", () => {
    const parsed = requestUploadSchema.parse({ ...valid, width: 3840, height: 2160 });
    expect(parsed).toMatchObject({ width: 3840, height: 2160 });
    expect(requestUploadSchema.parse(valid)).not.toHaveProperty("width");
  });

  it("rejects impossible sizes", () => {
    for (const size of [0, -1, 1.5, 100001]) {
      expect(requestUploadSchema.safeParse({ ...valid, width: size, height: 1080 }).success).toBe(false);
    }
  });
});

describe("file version size in the database", () => {
  const row = {
    id: "50000000-0000-4000-8000-0000000000a1",
    asset_id: "40000000-0000-4000-8000-0000000000a1",
    version_number: 1,
    raw_file_url: "private/workspaces/w/x.mp4",
    file_size_bytes: 10,
    transcoding_status: "pending",
    is_active_version: false,
    created_at: "2026-11-15T00:00:00Z",
  };

  /** A Supabase client stub that records each insert/update payload and answers in order. */
  function client(answers: Array<{ data: unknown; error: { code?: string; message?: string } | null }>) {
    const payloads: Record<string, unknown>[] = [];
    const answer = async () => answers.shift();
    const stub = {
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          payloads.push(payload);
          return { select: () => ({ single: answer }) };
        },
        update: (payload: Record<string, unknown>) => {
          payloads.push(payload);
          return { eq: () => ({ select: () => ({ single: answer }) }) };
        },
      }),
    };
    return { stub, payloads };
  }

  const missingColumn = {
    code: "PGRST204",
    message: "Could not find the 'width' column of 'asset_versions' in the schema cache",
  };

  it("saves and reads the size", async () => {
    const { stub, payloads } = client([{ data: { ...row, width: 1920, height: 1080 }, error: null }]);
    const version = await new SupabaseAssetVersionRepository(stub as never).create({
      assetId: row.asset_id,
      versionNumber: 1,
      rawFileUrl: row.raw_file_url,
      width: 1920,
      height: 1080,
    });
    expect(payloads[0]).toMatchObject({ width: 1920, height: 1080 });
    expect(version).toMatchObject({ width: 1920, height: 1080 });
  });

  it("leaves the size out when it isn't known", async () => {
    const { stub, payloads } = client([{ data: row, error: null }]);
    const version = await new SupabaseAssetVersionRepository(stub as never).create({
      assetId: row.asset_id,
      versionNumber: 1,
      rawFileUrl: row.raw_file_url,
    });
    expect(payloads[0]).not.toHaveProperty("width");
    expect(version).toMatchObject({ width: null, height: null });
  });

  it("still saves the version when the database doesn't have the size columns yet", async () => {
    const created = client([{ data: null, error: missingColumn }, { data: row, error: null }]);
    await new SupabaseAssetVersionRepository(created.stub as never).create({
      assetId: row.asset_id,
      versionNumber: 1,
      rawFileUrl: row.raw_file_url,
      width: 1920,
      height: 1080,
    });
    expect(created.payloads).toHaveLength(2);
    expect(created.payloads[1]).not.toHaveProperty("width");
    expect(created.payloads[1]).not.toHaveProperty("height");

    const updated = client([{ data: null, error: missingColumn }, { data: row, error: null }]);
    await new SupabaseAssetVersionRepository(updated.stub as never).update(row.id, {
      transcodingStatus: "ready",
      width: 1920,
      height: 1080,
    });
    expect(updated.payloads[1]).toEqual({ transcoding_status: "ready" });
  });

  it("doesn't retry other errors", async () => {
    const { stub, payloads } = client([{ data: null, error: { code: "23514", message: "check constraint" } }]);
    await expect(
      new SupabaseAssetVersionRepository(stub as never).create({
        assetId: row.asset_id,
        versionNumber: 1,
        rawFileUrl: row.raw_file_url,
        width: 1920,
        height: 1080,
      })
    ).rejects.toThrow("check constraint");
    expect(payloads).toHaveLength(1);
  });
});
