"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { generateAccentVariables } from "@/lib/theme-utils";

interface AccentThemeContextValue {
  accent: string;
  setAccent: (color: string) => void;
  resetAccent: () => void;
  savedAccent: string;
}

const AccentThemeContext = createContext<AccentThemeContextValue | null>(null);

export function AccentThemeProvider({
  children,
  initialAccent = "#F5551D",
}: {
  children: React.ReactNode;
  initialAccent?: string | null;
}) {
  const saved = initialAccent || "#F5551D";
  const [accent, setAccentState] = useState<string>(saved);

  // Sync state if initialAccent prop updates from server
  useEffect(() => {
    setAccentState(saved);
  }, [saved]);

  // Dynamically update CSS custom properties on document root
  useEffect(() => {
    const vars = generateAccentVariables(accent);
    const root = document.documentElement;

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [accent]);

  const value = useMemo(
    () => ({
      accent,
      setAccent: setAccentState,
      resetAccent: () => setAccentState(saved),
      savedAccent: saved,
    }),
    [accent, saved]
  );

  // Generates server/client SSR style block to avoid style flash
  const cssString = useMemo(() => {
    const vars = generateAccentVariables(accent);
    const rules = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
    return `:root { ${rules} }`;
  }, [accent]);

  return (
    <AccentThemeContext.Provider value={value}>
      <style dangerouslySetInnerHTML={{ __html: cssString }} />
      {children}
    </AccentThemeContext.Provider>
  );
}

export function useAccentTheme(): AccentThemeContextValue {
  const ctx = useContext(AccentThemeContext);
  if (!ctx) {
    return {
      accent: "#F5551D",
      setAccent: () => {},
      resetAccent: () => {},
      savedAccent: "#F5551D",
    };
  }
  return ctx;
}
