import { Ratelimit } from "@upstash/ratelimit";
import { redis, isRedisConfigured } from "./redis";
import type { RatelimitWindow } from "./ratelimit-policies";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface IRateLimiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

export function parseDurationMs(duration: RatelimitWindow): number {
  const match = duration.match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (!match) return 60_000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "ms":
      return val;
    case "s":
      return val * 1000;
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    default:
      return 60_000;
  }
}

/**
 * In-memory sliding window rate limiter used when Upstash Redis credentials
 * are not provided (e.g. local development or unit test suites).
 */
export class InMemoryRatelimit implements IRateLimiter {
  private static store = new Map<string, number[]>();

  constructor(
    private requests: number,
    private windowMs: number,
    private prefix: string = "cut"
  ) {}

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${this.prefix}:${identifier}`;
    const windowStart = now - this.windowMs;

    const timestamps = (InMemoryRatelimit.store.get(key) || []).filter(
      (ts) => ts > windowStart
    );

    if (timestamps.length >= this.requests) {
      const oldest = timestamps[0];
      const reset = oldest + this.windowMs;
      return {
        success: false,
        limit: this.requests,
        remaining: 0,
        reset,
      };
    }

    timestamps.push(now);
    InMemoryRatelimit.store.set(key, timestamps);

    return {
      success: true,
      limit: this.requests,
      remaining: this.requests - timestamps.length,
      reset: now + this.windowMs,
    };
  }

  static reset() {
    InMemoryRatelimit.store.clear();
  }
}

/**
 * Creates a rate limiter instance. Uses Upstash Redis if configured,
 * otherwise falls back to a deterministic in-memory sliding window limiter.
 */
export function createRatelimiter(
  requests: number,
  window: RatelimitWindow,
  prefix: string = "cut"
): IRateLimiter {
  if (isRedisConfigured && redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix,
      timeout: 1500,
      ephemeralCache: new Map(),
    });
  }

  const windowMs = parseDurationMs(window);
  return new InMemoryRatelimit(requests, windowMs, prefix);
}
