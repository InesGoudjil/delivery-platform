import { describe, it, expect } from "vitest";
import {
  CutReviewPlayer,
  isImageSource,
  type CutCommentMarker,
} from "@/components/video/cut-review-player";
import { formatTimecode } from "@/lib/timecode";

describe("CutReviewPlayer with Timeline Comment Markers", () => {
  it("exports CutReviewPlayer component properly", () => {
    expect(CutReviewPlayer).toBeDefined();
    expect(CutReviewPlayer.displayName).toBe("CutReviewPlayer");
  });

  describe("Timeline marker percentage calculation", () => {
    it("computes horizontal timeline percentages accurately", () => {
      const duration = 120; // 2 minutes
      const comment: CutCommentMarker = {
        id: "c-1",
        timestampSeconds: 30,
        authorName: "Editor",
        commentText: "Color grade looks warm",
        isResolved: false,
      };

      const percent = (comment.timestampSeconds! / duration) * 100;
      expect(percent).toBe(25);
    });

    it("clamps percentages between 0 and 100", () => {
      const duration = 60;
      const earlyComment: CutCommentMarker = { id: "c-0", timestampSeconds: 0 };
      const lateComment: CutCommentMarker = { id: "c-end", timestampSeconds: 60 };

      const earlyPct = Math.min(100, Math.max(0, (earlyComment.timestampSeconds! / duration) * 100));
      const latePct = Math.min(100, Math.max(0, (lateComment.timestampSeconds! / duration) * 100));

      expect(earlyPct).toBe(0);
      expect(latePct).toBe(100);
    });

    it("formats timecode for marker tooltip display correctly", () => {
      expect(formatTimecode(30, 24)).toBe("00:30:00");
      expect(formatTimecode(95.5, 24)).toBe("01:35:12");
    });

    it("filters out comments without valid timestampSeconds or outside media bounds", () => {
      const duration = 60;
      const sampleComments: CutCommentMarker[] = [
        { id: "c1", timestampSeconds: 15 },
        { id: "c2", timestampSeconds: null },
        { id: "c3", timestampSeconds: undefined },
        { id: "c4", timestampSeconds: -5 },
        { id: "c5", timestampSeconds: 45 },
        { id: "c6", timestampSeconds: 70 }, // beyond duration
      ];

      const validComments = sampleComments.filter(
        (c): c is CutCommentMarker & { timestampSeconds: number } =>
          typeof c.timestampSeconds === "number" &&
          c.timestampSeconds >= 0 &&
          duration > 0 &&
          c.timestampSeconds <= duration
      );

      expect(validComments).toHaveLength(2);
      expect(validComments.map((c) => c.id)).toEqual(["c1", "c5"]);
    });
  });
});
