import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

export const isRedisConfigured = Boolean(
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
);

/**
 * Serverless HTTP Redis client.
 * Automatically configured via UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 * Null when credentials are not configured (local dev / tests use in-memory fallback).
 */
export const redis: Redis | null = isRedisConfigured
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;
