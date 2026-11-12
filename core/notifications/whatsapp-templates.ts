import { oneLine } from "@/lib/security/html";

/**
 * The WhatsApp messages CineSpace sends. WhatsApp only allows business-initiated messages
 * from templates Meta has approved, so each message type here is a template you create in
 * the Zoho CPaaS console (one per language), with exactly these merge field names. The
 * console gives each template a key; put it in the environment variable `envName(...)` names,
 * e.g. ZOHO_CPAAS_WA_CLIENT_DELIVERY_READY_EN. A missing Arabic key falls back to English.
 *
 * Categories: "authentication" for the verification code (Meta fixes most of its wording),
 * "utility" for everything else. Marketing messages aren't supported.
 */

export type WhatsAppMessageType =
  | "verification_code"
  | "studio_cut_approved"
  | "studio_new_comments"
  | "studio_client_download"
  | "client_delivery_ready";

export type MessageLanguage = "en" | "ar";

export interface WhatsAppTemplateSpec {
  category: "authentication" | "utility";
  /** Shown in notification logs. */
  label: string;
  /** Merge fields the template uses, by name. */
  fields: readonly string[];
  /** The wording to submit for approval, with {{field}} placeholders. */
  text: Record<MessageLanguage, string>;
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppMessageType, WhatsAppTemplateSpec> = {
  verification_code: {
    category: "authentication",
    label: "WhatsApp number verification",
    fields: ["code"],
    text: {
      en: "{{code}} is your CineSpace verification code. For your security, do not share this code.",
      ar: "‏{{code}} هو رمز التحقق الخاص بك في CineSpace. حفاظاً على أمانك، لا تشارك هذا الرمز.",
    },
  },
  studio_cut_approved: {
    category: "utility",
    label: "Cut approved (WhatsApp)",
    fields: ["client_name", "delivery_title", "link"],
    text: {
      en: "{{client_name}} approved “{{delivery_title}}”. Open the delivery: {{link}}",
      ar: "وافق {{client_name}} على «{{delivery_title}}». افتح التسليم: {{link}}",
    },
  },
  studio_new_comments: {
    category: "utility",
    label: "New comments (WhatsApp)",
    fields: ["client_name", "comment_count", "delivery_title", "excerpt", "link"],
    text: {
      en: "{{client_name}} left {{comment_count}} new comment(s) on “{{delivery_title}}”. Latest: “{{excerpt}}”. Review them: {{link}}",
      ar: "ترك {{client_name}} عدد {{comment_count}} من التعليقات الجديدة على «{{delivery_title}}». آخر تعليق: «{{excerpt}}». راجعها هنا: {{link}}",
    },
  },
  studio_client_download: {
    category: "utility",
    label: "Client download (WhatsApp)",
    fields: ["item_description", "delivery_title", "link"],
    text: {
      en: "Your client downloaded {{item_description}} from “{{delivery_title}}”. Open the delivery: {{link}}",
      ar: "قام عميلك بتنزيل {{item_description}} من «{{delivery_title}}». افتح التسليم: {{link}}",
    },
  },
  client_delivery_ready: {
    category: "utility",
    label: "Review link to client (WhatsApp)",
    fields: ["studio_name", "delivery_title", "link"],
    text: {
      en: "{{studio_name}} shared “{{delivery_title}}” with you for review. Watch it and leave your notes here: {{link}}",
      ar: "شارك {{studio_name}} معك «{{delivery_title}}» للمراجعة. شاهده واترك ملاحظاتك هنا: {{link}}",
    },
  },
};

/** The environment variable that holds a template's Zoho CPaaS key. */
export function templateEnvName(type: WhatsAppMessageType, language: MessageLanguage): string {
  return `ZOHO_CPAAS_WA_${type.toUpperCase()}_${language.toUpperCase()}`;
}

/** The template key for a message type and language, falling back to English; null when not set up. */
export function templateKeyFor(
  type: WhatsAppMessageType,
  language: MessageLanguage,
  source: Record<string, string | undefined> = process.env
): { key: string; language: MessageLanguage } | null {
  for (const candidate of language === "en" ? (["en"] as const) : ([language, "en"] as const)) {
    const key = source[templateEnvName(type, candidate)]?.trim();
    if (key) return { key, language: candidate };
  }
  return null;
}

// WhatsApp template parameters can't contain line breaks, tabs or long runs of spaces.
const MAX_FIELD_LENGTH = 300;

/** The merge fields for a message, each one line of plain text; throws if one is missing. */
export function templateVariables(
  type: WhatsAppMessageType,
  values: Record<string, string | number | null | undefined>
): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const field of WHATSAPP_TEMPLATES[type].fields) {
    const value = oneLine(values[field] ?? "", MAX_FIELD_LENGTH);
    if (!value) throw new Error(`WhatsApp message "${type}" is missing "${field}".`);
    variables[field] = value;
  }
  return variables;
}

export function messageLanguage(value: string | null | undefined): MessageLanguage {
  return value === "ar" ? "ar" : "en";
}
