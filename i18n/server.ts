import "server-only";
import { cookies } from "next/headers";
import { type Locale, defaultLocale, isRTL } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

const dictionaries: Record<Locale, Dictionary> = {
  en,
  ar,
};

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const stored = cookieStore.get("cinespace_locale")?.value as Locale | undefined;
    if (stored && (stored === "en" || stored === "ar")) {
      return stored;
    }
  } catch {}
  return defaultLocale;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  const targetLocale = locale || (await getServerLocale());
  return dictionaries[targetLocale] || dictionaries[defaultLocale];
}

export { en, ar, isRTL };
