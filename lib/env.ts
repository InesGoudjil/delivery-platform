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

  // AWS S3 Glacier Deep Archive Configuration (The Silo)
  AWS_REGION: z.string().optional().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(""),
  AWS_S3_SILO_BUCKET: z.string().optional().default(""),
  AWS_SILO_STORAGE_CLASS: z.enum(["DEEP_ARCHIVE", "GLACIER"]).default("DEEP_ARCHIVE"),
  SILO_WEBHOOK_SECRET: z.string().optional().default(""),
  // Kill switch for The Silo. Off unless set to "true" (any case); any other value, or a typo, keeps it off.
  SILO_ENABLED: z
    .string()
    .optional()
    .transform((v) => v?.trim().toLowerCase() === "true"),

  // Stripe Billing Configuration
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),

  // App & Storage Options
  STORAGE_PROVIDER: z.enum(["cloudflare", "mock", "auto"]).default("auto"),
  NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .optional()
    .default(process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Zoho ZeptoMail Configuration
  ZEPTOMAIL_API_TOKEN: z.string().optional().default(""),
  ZEPTOMAIL_FROM_EMAIL: z.string().optional().default("noreply@cinespace.film"),
  ZEPTOMAIL_FROM_NAME: z.string().optional().default("CineSpace"),
  // Where replies to Pedro's emails go (a monitored inbox): "reply to this email" only works with it set.
  EMAIL_REPLY_TO: z.string().optional().default(""),
  ZEPTOMAIL_API_URL: z.string().optional().default("https://api.zeptomail.com/v1.1/email"),
  ZEPTOMAIL_BOUNCE_ADDRESS: z.string().optional().default(""),

  // Zoho CPaaS (ZeptoMail's new name): WhatsApp through a Meta WhatsApp Business Account
  // connected in the Zoho CPaaS console. Template keys are per message type and language;
  // see docs/notifications.md for the templates to create.
  ZOHO_CPAAS_API_URL: z.string().optional().default("https://cpaas.zoho.com"),
  ZOHO_CPAAS_WHATSAPP_TOKEN: z.string().optional().default(""),
  ZOHO_CPAAS_WHATSAPP_FROM: z.string().optional().default(""),
  // Protects /api/cron/* (sent as "Authorization: Bearer <secret>", as Vercel Cron does).
  CRON_SECRET: z.string().optional().default(""),

  // Upstash Redis Configuration (Rate Limiting & Serverless Caching)
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),

  // Resend Email Configuration (Legacy / Fallback during migration)
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
  isAwsSiloConfigured: boolean;
  /** The Silo may run: SILO_ENABLED is "true" and the AWS settings are real. Check this at every Silo entry point. */
  isSiloEnabled: boolean;
  isMetaPixelEnabled: boolean;
  isMetaCapiEnabled: boolean;
  isPostHogClientEnabled: boolean;
  isPostHogServerEnabled: boolean;
  isPostHogSessionReplayEnabled: boolean;
  isZeptoMailConfigured: boolean;
  /** Zoho CPaaS WhatsApp: token and a valid sender number are set. */
  isWhatsAppConfigured: boolean;
  isUpstashConfigured: boolean;
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

  const isAwsSiloConfigured =
    Boolean(parsed.AWS_S3_SILO_BUCKET) &&
    Boolean(parsed.AWS_ACCESS_KEY_ID) &&
    parsed.AWS_ACCESS_KEY_ID !== "your-aws-access-key-id" &&
    Boolean(parsed.AWS_SECRET_ACCESS_KEY) &&
    parsed.AWS_SECRET_ACCESS_KEY !== "your-aws-secret-access-key";

  // The Silo deletes R2 originals once they are in Glacier, so it never runs half-configured.
  const isSiloEnabled = parsed.SILO_ENABLED && isAwsSiloConfigured;

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

  const isZeptoMailConfigured =
    Boolean(parsed.ZEPTOMAIL_API_TOKEN) &&
    parsed.ZEPTOMAIL_API_TOKEN.trim() !== "" &&
    parsed.ZEPTOMAIL_API_TOKEN !== "your-zeptomail-token";

  const isWhatsAppConfigured =
    Boolean(parsed.ZOHO_CPAAS_WHATSAPP_TOKEN.trim()) &&
    parsed.ZOHO_CPAAS_WHATSAPP_TOKEN !== "your-zoho-cpaas-whatsapp-token" &&
    /^\+?\d{8,15}$/.test(parsed.ZOHO_CPAAS_WHATSAPP_FROM.replace(/[\s-]/g, ""));

  const isUpstashConfigured =
    Boolean(parsed.UPSTASH_REDIS_REST_URL) &&
    Boolean(parsed.UPSTASH_REDIS_REST_TOKEN);

  return {
    ...parsed,
    CLOUDFLARE_R2_PUBLIC_BUCKET: publicBucket,
    CLOUDFLARE_R2_PRIVATE_BUCKET: privateBucket,
    isCloudflareStreamConfigured,
    isCloudflareR2Configured,
    isAwsSiloConfigured,
    isSiloEnabled,
    isMetaPixelEnabled,
    isMetaCapiEnabled,
    isPostHogClientEnabled,
    isPostHogServerEnabled,
    isPostHogSessionReplayEnabled,
    isZeptoMailConfigured,
    isWhatsAppConfigured,
    isUpstashConfigured,
  };
}

export const env = parseEnv();
