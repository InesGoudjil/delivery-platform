import { describe, expect, it } from "vitest";
import {
  WHATSAPP_TEMPLATES,
  messageLanguage,
  templateEnvName,
  templateKeyFor,
  templateVariables,
  type WhatsAppMessageType,
} from "@/core/notifications/whatsapp-templates";

const TYPES = Object.keys(WHATSAPP_TEMPLATES) as WhatsAppMessageType[];

describe("WhatsApp templates", () => {
  it.each(TYPES)("%s: the wording in both languages uses exactly its merge fields", (type) => {
    const spec = WHATSAPP_TEMPLATES[type];
    for (const text of Object.values(spec.text)) {
      const used = [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      expect([...new Set(used)].sort()).toEqual([...spec.fields].sort());
    }
  });

  it("only uses categories Meta allows for business-initiated messages", () => {
    for (const spec of Object.values(WHATSAPP_TEMPLATES)) {
      expect(["authentication", "utility"]).toContain(spec.category);
    }
  });

  it("names the environment variable for each template key", () => {
    expect(templateEnvName("client_delivery_ready", "en")).toBe("ZOHO_CPAAS_WA_CLIENT_DELIVERY_READY_EN");
    expect(templateEnvName("verification_code", "ar")).toBe("ZOHO_CPAAS_WA_VERIFICATION_CODE_AR");
  });

  it("falls back to the English template when the Arabic one isn't set up, and to nothing without either", () => {
    const en = { ZOHO_CPAAS_WA_STUDIO_CUT_APPROVED_EN: " tpl-en " };
    expect(templateKeyFor("studio_cut_approved", "ar", en)).toEqual({ key: "tpl-en", language: "en" });
    expect(templateKeyFor("studio_cut_approved", "ar", { ...en, ZOHO_CPAAS_WA_STUDIO_CUT_APPROVED_AR: "tpl-ar" })).toEqual({
      key: "tpl-ar",
      language: "ar",
    });
    expect(templateKeyFor("studio_cut_approved", "en", { ZOHO_CPAAS_WA_STUDIO_CUT_APPROVED_AR: "tpl-ar" })).toBeNull();
    expect(templateKeyFor("studio_cut_approved", "en", {})).toBeNull();
  });

  it("turns values into one line of plain text, and refuses a message with a field missing", () => {
    const variables = templateVariables("studio_cut_approved", {
      client_name: "Sara\nAl\tMansoori",
      delivery_title: "x".repeat(400),
      link: "https://app.test/a/deliveries/1",
    });
    expect(variables.client_name).toBe("Sara Al Mansoori");
    expect(variables.delivery_title.length).toBeLessThanOrEqual(300);
    expect(Object.keys(variables).sort()).toEqual(["client_name", "delivery_title", "link"]);
    expect(() => templateVariables("studio_cut_approved", { client_name: "Sara", delivery_title: "Film" })).toThrow(/link/);
  });

  it("speaks Arabic only to Arabic workspaces", () => {
    expect(messageLanguage("ar")).toBe("ar");
    expect(messageLanguage("en")).toBe("en");
    expect(messageLanguage("fr")).toBe("en");
    expect(messageLanguage(null)).toBe("en");
  });
});
