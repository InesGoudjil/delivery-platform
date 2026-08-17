"use client";

import * as React from "react";
import { type Locale, defaultLocale, isRTL, locales } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

const dictionaries: Record<Locale, Dictionary> = {
  en,
  ar,
};

interface I18nContextType {
  locale: Locale;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  dict: Dictionary;
  t: (keyPath: string, fallback?: string) => string;
}

const I18nContext = React.createContext<I18nContextType | undefined>(undefined);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: I18nProviderProps) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cinespace_locale") as Locale | null;
      if (stored && (stored === "en" || stored === "ar")) {
        return stored;
      }
    }
    return initialLocale;
  });

  const dir: "ltr" | "rtl" = isRTL(locale) ? "rtl" : "ltr";
  const dict = dictionaries[locale] || dictionaries[defaultLocale];

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      try {
        localStorage.setItem("cinespace_locale", locale);
        // Also set a lightweight cookie for SSR
        document.cookie = `cinespace_locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
      } catch {}
    }
  }, [locale, dir]);

  const setLocale = React.useCallback((newLocale: Locale) => {
    if (newLocale === "en" || newLocale === "ar") {
      setLocaleState(newLocale);
    }
  }, []);

  const toggleLocale = React.useCallback(() => {
    setLocaleState((prev) => (prev === "en" ? "ar" : "en"));
  }, []);

  const t = React.useCallback(
    (keyPath: string, fallback?: string): string => {
      const parts = keyPath.split(".");
      let current: any = dict;

      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = current[part];
        } else {
          return fallback || keyPath;
        }
      }

      return typeof current === "string" ? current : fallback || keyPath;
    },
    [dict]
  );

  const value = React.useMemo(
    () => ({
      locale,
      dir,
      isRtl: dir === "rtl",
      setLocale,
      toggleLocale,
      dict,
      t,
    }),
    [locale, dir, setLocale, toggleLocale, dict, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

export const useLocale = useTranslation;
export const useI18n = useTranslation;
