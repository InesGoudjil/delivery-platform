import { describe, it, expect } from "vitest";
import { IN_FILTER_CHUNK, inChunks } from "@/core/repositories/in-chunks";
import { SupabaseFeedbackRepository } from "@/core/repositories/feedback.repository";
import { SupabaseAssetVersionRepository } from "@/core/repositories/asset.repository";

/** A Supabase client that records each `.in()` list and answers with `rows(list)`. */
function fakeClient(rows: (ids: string[]) => any[]) {
  const inLists: string[][] = [];
  const client = {
    from: () => {
      let ids: string[] = [];
      const builder: any = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "then") {
              return (resolve: (value: unknown) => unknown) => resolve({ data: rows(ids), error: null });
            }
            if (prop === "in") {
              return (_column: string, values: string[]) => {
                ids = values;
                inLists.push(values);
                return builder;
              };
            }
            return () => builder;
          },
        }
      );
      return builder;
    },
  };
  return { client: client as any, inLists };
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("inChunks", () => {
  it("splits long id lists, drops duplicates and joins the rows in chunk order", async () => {
    const ids = Array.from({ length: IN_FILTER_CHUNK * 2 + 5 }, (_, i) => uuid(i));
    const seen: number[] = [];
    const rows = await inChunks([...ids, ids[0]], async (chunk) => {
      seen.push(chunk.length);
      return chunk;
    });
    expect(seen).toEqual([IN_FILTER_CHUNK, IN_FILTER_CHUNK, 5]);
    expect(rows).toEqual(ids);
  });

  it("makes no query for an empty list", async () => {
    let calls = 0;
    expect(await inChunks([], async () => [calls++])).toEqual([]);
    expect(calls).toBe(0);
  });
});

describe("SupabaseFeedbackRepository.listByAssetVersionIds", () => {
  const comment = (id: string, versionId: string, timestamp: number | null, createdAt: string) => ({
    id,
    asset_version_id: versionId,
    author_name: "Client",
    comment_text: id,
    timestamp_seconds: timestamp,
    created_at: createdAt,
    updated_at: createdAt,
    feedback_replies: [],
  });

  it("keeps the query's order (timecode, untimed last, then oldest) across chunks", async () => {
    const versionIds = Array.from({ length: IN_FILTER_CHUNK + 1 }, (_, i) => uuid(i));
    const { client, inLists } = fakeClient((ids) =>
      ids.includes(versionIds[0])
        ? [comment("a-10s", versionIds[0], 10, "2026-11-01T00:00:00Z"), comment("a-untimed", versionIds[0], null, "2026-11-01T00:00:00Z")]
        : [comment("b-2s", versionIds[IN_FILTER_CHUNK], 2, "2026-11-02T00:00:00Z"), comment("b-10s-older", versionIds[IN_FILTER_CHUNK], 10, "2026-10-01T00:00:00Z")]
    );

    const rows = await new SupabaseFeedbackRepository(client).listByAssetVersionIds(versionIds);

    expect(inLists.map((list) => list.length)).toEqual([IN_FILTER_CHUNK, 1]);
    expect(rows.map((r) => r.id)).toEqual(["b-2s", "b-10s-older", "a-10s", "a-untimed"]);
  });
});

describe("SupabaseAssetVersionRepository.findActiveVersionsByAssetIds", () => {
  it("maps each file to its active version in one query", async () => {
    const { client, inLists } = fakeClient(() => [
      { id: "v2", asset_id: "asset_1", version_number: 2, is_active_version: true },
      { id: "v9", asset_id: "asset_2", version_number: 9, is_active_version: true },
    ]);

    const byAsset = await new SupabaseAssetVersionRepository(client).findActiveVersionsByAssetIds(["asset_1", "asset_2", "asset_3"]);

    expect(inLists).toEqual([["asset_1", "asset_2", "asset_3"]]);
    expect(byAsset.get("asset_1")?.id).toBe("v2");
    expect(byAsset.get("asset_2")?.id).toBe("v9");
    expect(byAsset.has("asset_3")).toBe(false);
  });
});
