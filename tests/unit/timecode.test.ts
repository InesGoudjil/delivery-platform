import { describe, it, expect } from "vitest";
import {
  getTimecodeParts,
  formatTimecode,
  formatDuration,
  parseTimecodeToSeconds,
  stepByFrames,
} from "@/lib/timecode";

describe("lib/timecode", () => {
  describe("getTimecodeParts", () => {
    it("converts seconds to frame-accurate parts at 24 fps", () => {
      // 3661.5 seconds = 1 hr (3600), 1 min (60), 1 sec (1), 0.5s * 24 = 12 frames
      const parts = getTimecodeParts(3661.5, 24);
      expect(parts).toEqual({
        hours: 1,
        minutes: 1,
        seconds: 1,
        frames: 12,
      });
    });

    it("handles zero and negative or NaN inputs safely", () => {
      expect(getTimecodeParts(0)).toEqual({ hours: 0, minutes: 0, seconds: 0, frames: 0 });
      expect(getTimecodeParts(-10)).toEqual({ hours: 0, minutes: 0, seconds: 0, frames: 0 });
      expect(getTimecodeParts(NaN)).toEqual({ hours: 0, minutes: 0, seconds: 0, frames: 0 });
    });
  });

  describe("formatTimecode", () => {
    it("formats MM:SS:FF when hours is 0", () => {
      // 65.5s at 24fps -> 01:05:12
      expect(formatTimecode(65.5, 24)).toBe("01:05:12");
    });

    it("formats HH:MM:SS:FF when hours > 0 or showHours is true", () => {
      expect(formatTimecode(3665.5, 24)).toBe("01:01:05:12");
      expect(formatTimecode(65.5, 24, true)).toBe("00:01:05:12");
    });

    it("respects different framerates (e.g. 30 fps)", () => {
      // 1.5s at 30fps -> 00:01:15
      expect(formatTimecode(1.5, 30)).toBe("00:01:15");
    });
  });

  describe("formatDuration", () => {
    it("formats MM:SS for durations under 1 hour", () => {
      expect(formatDuration(125)).toBe("02:05");
      expect(formatDuration(59)).toBe("00:59");
    });

    it("formats HH:MM:SS for durations of 1 hour or more", () => {
      expect(formatDuration(3665)).toBe("01:01:05");
    });

    it("handles invalid or negative durations safely", () => {
      expect(formatDuration(-5)).toBe("00:00");
      expect(formatDuration(NaN)).toBe("00:00");
    });
  });

  describe("parseTimecodeToSeconds", () => {
    it("parses HH:MM:SS:FF accurately back to seconds", () => {
      const seconds = parseTimecodeToSeconds("01:01:05:12", 24);
      expect(seconds).toBe(3665.5);
    });

    it("parses MM:SS:FF accurately back to seconds", () => {
      const seconds = parseTimecodeToSeconds("01:05:12", 24);
      expect(seconds).toBe(65.5);
    });

    it("parses MM:SS accurately back to seconds", () => {
      const seconds = parseTimecodeToSeconds("02:05");
      expect(seconds).toBe(125);
    });

    it("returns 0 for invalid inputs", () => {
      expect(parseTimecodeToSeconds("")).toBe(0);
      expect(parseTimecodeToSeconds("invalid:timecode")).toBe(0);
    });
  });

  describe("stepByFrames", () => {
    it("steps forward by 1 frame correctly", () => {
      const result = stepByFrames(1.0, 1, 10.0, 24);
      expect(result).toBeCloseTo(1.0 + 1 / 24);
    });

    it("steps backward by 1 frame correctly", () => {
      const result = stepByFrames(1.0, -1, 10.0, 24);
      expect(result).toBeCloseTo(1.0 - 1 / 24);
    });

    it("clamps to 0 and does not go negative", () => {
      const result = stepByFrames(0.01, -5, 10.0, 24);
      expect(result).toBe(0);
    });

    it("clamps to max duration", () => {
      const result = stepByFrames(9.99, 10, 10.0, 24);
      expect(result).toBe(10.0);
    });
  });
});
