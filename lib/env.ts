import { z } from "zod";

/**
 * Zod schema defining and validating all environment variables across the application.
 */
const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required")
    .catch("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
    .catch(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),

  // Cloudflare Stream Configuration (Videos)
  CLOUDFLARE_ACCOUNT_ID: z.string().optional().default(""),
  CLOUDFLARE_API_TOKEN: z.string().optional().default(""),
  CLOUDFLARE_STREAM_TOKEN: z.string().optional().default(""),
  CLOUDFLARE_STREAM_SUBDOMAIN: z.string().optional().default("videodelivery.net"),
  CLOUDFLARE_WEBHOOK_SECRET: z.string().optional().default(""),

  // Cloudflare R2 Configuration (Images & Photo Galleries)
  CLOUDFLARE_R2_BUCKET: z.string().optional().default(""),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional().default(""),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  CLOUDFLARE_R2_ENDPOINT: z.string().optional().default(""),
  CLOUDFLARE_R2_PUBLIC_DOMAIN: z.string().optional().default(""),

  // Stripe Billing Configuration
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),

  // App & Storage Options
  STORAGE_PROVIDER: z.enum(["cloudflare", "mock", "auto"]).default("auto"),
  NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema> & {
  isCloudflareStreamConfigured: boolean;
  isCloudflareR2Configured: boolean;
};

/**
 * Parses and validates process.env variables safely.
 */
function parseEnv(): Env {
  const rawApiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN || "";
  
  const rawEnv = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: rawApiToken,
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    console.error("❌ Invalid environment variables detected:", result.error.format());
  }

  const parsed = result.success ? result.data : envSchema.parse(rawEnv);

  const isCloudflareStreamConfigured =
    Boolean(parsed.CLOUDFLARE_ACCOUNT_ID) &&
    parsed.CLOUDFLARE_ACCOUNT_ID !== "your-cloudflare-account-id" &&
    Boolean(rawApiToken) &&
    rawApiToken !== "your-cloudflare-stream-token";

  const isCloudflareR2Configured =
    Boolean(parsed.CLOUDFLARE_R2_BUCKET) &&
    Boolean(parsed.CLOUDFLARE_R2_ACCESS_KEY_ID) &&
    Boolean(parsed.CLOUDFLARE_R2_SECRET_ACCESS_KEY);

  return {
    ...parsed,
    isCloudflareStreamConfigured,
    isCloudflareR2Configured,
  };
}

export const env = parseEnv();
