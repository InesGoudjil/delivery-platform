/**
 * Timecode and frame calculation utilities for CUT video review.
 * Default standard framerate for cinematic delivery cuts is 24 fps.
 */

export interface TimecodeParts {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
}

/**
 * Converts seconds into frame-accurate timecode parts.
 */
export function getTimecodeParts(seconds: number, fps = 24): TimecodeParts {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const frames = Math.floor((safeSec % 1) * fps);

  return { hours, minutes, seconds: secs, frames };
}

/**
 * Formats seconds into standard film timecode string (HH:MM:SS:FF or MM:SS:FF).
 */
export function formatTimecode(seconds: number, fps = 24, showHours = false): string {
  const { hours, minutes, seconds: secs, frames } = getTimecodeParts(seconds, fps);

  const mm = minutes.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  const ff = frames.toString().padStart(2, "0");

  if (showHours || hours > 0) {
    const hh = hours.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}:${ff}`;
  }

  return `${mm}:${ss}:${ff}`;
}

/**
 * Formats seconds as clean playback duration (MM:SS or HH:MM:SS).
 */
export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);

  const mm = minutes.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");

  if (hours > 0) {
    const hh = hours.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}

/**
 * Parses a timecode string (e.g. "01:24:12" or "00:14") back into seconds.
 */
export function parseTimecodeToSeconds(timecode: string, fps = 24): number {
  if (!timecode) return 0;
  const parts = timecode.split(":").map(Number);
  if (parts.some(isNaN)) return 0;

  if (parts.length === 4) {
    // HH:MM:SS:FF
    const [h, m, s, f] = parts;
    return h * 3600 + m * 60 + s + f / fps;
  } else if (parts.length === 3) {
    // MM:SS:FF
    const [m, s, f] = parts;
    return m * 60 + s + f / fps;
  } else if (parts.length === 2) {
    // MM:SS
    const [m, s] = parts;
    return m * 60 + s;
  }

  return 0;
}

/**
 * Calculates new time after stepping by a given number of frames.
 */
export function stepByFrames(
  currentTime: number,
  frameDelta: number,
  duration: number,
  fps = 24
): number {
  const frameDuration = 1 / fps;
  const newTime = currentTime + frameDelta * frameDuration;
  return Math.min(Math.max(0, newTime), duration > 0 ? duration : Infinity);
}
