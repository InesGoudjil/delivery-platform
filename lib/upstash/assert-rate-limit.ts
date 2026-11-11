import { headers } from "next/headers";
import { createRatelimiter, type RateLimitResult } from "./ratelimit";
import type { RatelimitPolicy } from "./ratelimit-policies";

/**
 * Formats milliseconds until reset into human-readable duration string.
 */
export function formatRetryAfter(resetAt: number): string {
  const seconds = Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1);

  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/**
 * Extracts client IP safely from incoming Next.js request headers.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    return headerList.get("x-real-ip") || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

export class RateLimitError extends Error {
  readonly retryAfter: string;
  readonly reset: number;
  readonly remaining: number;

  constructor(
    message: string,
    context: { retryAfter: string; reset: number; remaining: number }
  ) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = context.retryAfter;
    this.reset = context.reset;
    this.remaining = context.remaining;
  }
}

// Cache of instanced limiters per policy key
const limiterCache = new Map<string, ReturnType<typeof createRatelimiter>>();

function getLimiterForPolicy(policy: RatelimitPolicy) {
  const cacheKey = `${policy.keyPrefix}:${policy.attempts}:${policy.window}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = createRatelimiter(policy.attempts, policy.window, policy.keyPrefix);
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

export interface CheckRateLimitResult {
  success: boolean;
  error?: string;
  remaining: number;
  reset: number;
  retryAfter?: string;
}

/**
 * Checks a rate limit policy against a given identifier.
 * Returns { success, error, remaining, reset, retryAfter }.
 */
export async function checkRateLimit({
  policy,
  identifier,
}: {
  policy: RatelimitPolicy;
  identifier?: string | string[];
}): Promise<CheckRateLimitResult> {
  const resolvedId = identifier
    ? Array.isArray(identifier)
      ? identifier.join(":")
      : identifier
    : await getClientIp();

  const limiter = getLimiterForPolicy(policy);
  const result: RateLimitResult = await limiter.limit(resolvedId);

  if (!result.success) {
    const retryAfter = formatRetryAfter(result.reset);
    const message =
      typeof policy.message === "function"
        ? policy.message({
            retryAfter,
            attempts: policy.attempts,
            window: policy.window,
          })
        : policy.message ||
          `Too many requests. Please try again in ${retryAfter}.`;

    return {
      success: false,
      error: message,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter,
    };
  }

  return {
    success: true,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Asserts that the rate limit has not been exceeded. Throws a RateLimitError
 * if the request is rate-limited.
 */
export async function assertRateLimit({
  policy,
  identifier,
}: {
  policy: RatelimitPolicy;
  identifier?: string | string[];
}): Promise<void> {
  const result = await checkRateLimit({ policy, identifier });
  if (!result.success) {
    throw new RateLimitError(result.error || "Too many requests.", {
      retryAfter: result.retryAfter || "a few minutes",
      reset: result.reset,
      remaining: result.remaining,
    });
  }
}
