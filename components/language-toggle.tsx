"use client";

import * as React from "react";
import { Globe, Check } from "lucide-react";
import { useTranslation, localeNames, type Locale } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center justify-center font-mono text-xs"
          title="Switch Language / تغيير اللغة"
        >
          <Globe className="size-4" />
          <span className="sr-only">Switch Language</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-36 bg-popover border border-border text-popover-foreground p-1 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
      >
        <DropdownMenuItem
          onClick={() => setLocale("en")}
          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">English</span>
          </div>
          {locale === "en" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setLocale("ar")}
          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground font-sans">العربية</span>
          </div>
          {locale === "ar" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const LanguageSwitcher = LanguageToggle;
