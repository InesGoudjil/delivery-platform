"use client";

import * as React from "react";
import { Globe, Check, Lock } from "lucide-react";
import { useTranslation } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface LanguageToggleProps {
  allowedLanguages?: string[];
  workspaceSlug?: string;
}

export function LanguageToggle({ allowedLanguages, workspaceSlug }: LanguageToggleProps) {
  const { locale, setLocale } = useTranslation();

  const canArabic = allowedLanguages ? allowedLanguages.includes("ar") : true;

  const handleSelectArabic = () => {
    if (!canArabic) {
      toast.error(
        "Arabic language support requires Pro or Studio plan. Upgrade to unlock bilingual client deliveries & dashboard."
      );
      return;
    }
    setLocale("ar");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center font-mono text-xs outline-none"
        title="Switch Language / تغيير اللغة"
      >
        <Globe className="size-4" />
        <span className="sr-only">Switch Language</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-40 bg-popover border border-border text-popover-foreground p-1 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
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
          onClick={handleSelectArabic}
          className={cn(
            "flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground",
            !canArabic && "opacity-75"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground font-sans">العربية</span>
            {!canArabic && (
              <Badge
                variant="outline"
                className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30 font-mono font-bold px-1 py-0 h-4 leading-none"
              >
                PRO+
              </Badge>
            )}
          </div>
          {locale === "ar" ? (
            <Check className="size-3.5 text-primary" />
          ) : !canArabic ? (
            <Lock className="size-3 text-muted-foreground" />
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const LanguageSwitcher = LanguageToggle;
