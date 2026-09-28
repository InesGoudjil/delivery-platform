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

  // Cloudflare R2 Configuration (Images, Photo Galleries, and Deliveries)
  CLOUDFLARE_R2_BUCKET: z.string().optional().default(""),
  CLOUDFLARE_R2_PUBLIC_BUCKET: z.string().optional().default(""),
  CLOUDFLARE_R2_PRIVATE_BUCKET: z.string().optional().default(""),
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

  // Resend Email Configuration
  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM_EMAIL: z.string().optional().default("onboarding@resend.dev"),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),

  // Meta Pixel + Conversions API
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional().default(""),
  NEXT_PUBLIC_META_DEV_PIXEL: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  META_ACCESS_TOKEN: z.string().optional().default(""),
  META_CAPI_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
  META_TEST_EVENT_CODE: z.string().optional().default(""),

  // PostHog
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional().default("/ingest"),
  NEXT_PUBLIC_POSTHOG_UI_HOST: z
    .string()
    .optional()
    .default("https://eu.posthog.com"),
  POSTHOG_PROJECT_API_KEY: z.string().optional().default(""),
  POSTHOG_HOST: z
    .string()
    .optional()
    .default("https://eu.i.posthog.com"),
  POSTHOG_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
  POSTHOG_SESSION_REPLAY_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
});

export type Env = z.infer<typeof envSchema> & {
  isCloudflareStreamConfigured: boolean;
  isCloudflareR2Configured: boolean;
  isMetaPixelEnabled: boolean;
  isMetaCapiEnabled: boolean;
  isPostHogClientEnabled: boolean;
  isPostHogServerEnabled: boolean;
  isPostHogSessionReplayEnabled: boolean;
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

  const publicBucket = parsed.CLOUDFLARE_R2_PUBLIC_BUCKET || parsed.CLOUDFLARE_R2_BUCKET;
  const privateBucket = parsed.CLOUDFLARE_R2_PRIVATE_BUCKET || parsed.CLOUDFLARE_R2_BUCKET;

  const isCloudflareR2Configured =
    Boolean(publicBucket || privateBucket) &&
    Boolean(parsed.CLOUDFLARE_R2_ACCESS_KEY_ID) &&
    Boolean(parsed.CLOUDFLARE_R2_SECRET_ACCESS_KEY);

  const isMetaPixelEnabled = Boolean(parsed.NEXT_PUBLIC_META_PIXEL_ID);
  const isMetaCapiEnabled =
    isMetaPixelEnabled &&
    parsed.META_CAPI_ENABLED &&
    Boolean(parsed.META_ACCESS_TOKEN) &&
    parsed.META_ACCESS_TOKEN !== "your-meta-access-token";

  const isPostHogClientEnabled =
    parsed.POSTHOG_ENABLED &&
    Boolean(parsed.NEXT_PUBLIC_POSTHOG_KEY) &&
    parsed.NEXT_PUBLIC_POSTHOG_KEY !== "your-posthog-project-key";
  const isPostHogServerEnabled =
    isPostHogClientEnabled &&
    Boolean(parsed.POSTHOG_PROJECT_API_KEY) &&
    parsed.POSTHOG_PROJECT_API_KEY !== "your-posthog-project-api-key";
  const isPostHogSessionReplayEnabled =
    isPostHogClientEnabled && parsed.POSTHOG_SESSION_REPLAY_ENABLED;

  return {
    ...parsed,
    CLOUDFLARE_R2_PUBLIC_BUCKET: publicBucket,
    CLOUDFLARE_R2_PRIVATE_BUCKET: privateBucket,
    isCloudflareStreamConfigured,
    isCloudflareR2Configured,
    isMetaPixelEnabled,
    isMetaCapiEnabled,
    isPostHogClientEnabled,
    isPostHogServerEnabled,
    isPostHogSessionReplayEnabled,
  };
}

export const env = parseEnv();
