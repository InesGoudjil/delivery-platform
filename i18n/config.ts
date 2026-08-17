export type Locale = "en" | "ar";

export const defaultLocale: Locale = "en";

export const locales: readonly Locale[] = ["en", "ar"] as const;

export const localeNames: Record<Locale, { name: string; nativeName: string; dir: "ltr" | "rtl" }> = {
  en: {
    name: "English",
    nativeName: "English",
    dir: "ltr",
  },
  ar: {
    name: "Arabic",
    nativeName: "العربية",
    dir: "rtl",
  },
};

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}
