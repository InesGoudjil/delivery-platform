import { describe, it, expect, vi, afterEach } from "vitest";
import { CloudflareStreamStorageProvider } from "@/core/providers/storage/cloudflare-stream.provider";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CloudflareStreamStorageProvider.getSecureDownloadUrl", () => {
  it("asks Stream for a video's MP4 once an hour on this server, not on every page view", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-17T10:00:00Z") });
    const stream = new CloudflareStreamStorageProvider({ accountId: "acc", apiToken: "tok" });
    const warmUp = vi.spyOn(stream, "ensureMp4DownloadEnabled").mockResolvedValue(null);
    const film = "a".repeat(32);
    const trailer = "b".repeat(32);

    const url = await stream.getSecureDownloadUrl(film, "Film.mp4");
    await stream.getSecureDownloadUrl(film, "Film.mp4");
    await stream.getSecureDownloadUrl(trailer, "Trailer.mp4");

    expect(url).toBe(`/api/media/${film}?download=true&filename=Film.mp4`);
    expect(warmUp.mock.calls.map(([uid]) => uid)).toEqual([film, trailer]);

    vi.setSystemTime(new Date("2026-11-17T11:00:01Z"));
    await stream.getSecureDownloadUrl(film, "Film.mp4");
    expect(warmUp).toHaveBeenCalledTimes(3);
  });
});
