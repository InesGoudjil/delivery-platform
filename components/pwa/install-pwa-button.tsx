"use client";

import * as React from "react";
import { Download, Laptop, Check } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";
import { TypographySpan } from "@/components/ui/typography";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface InstallPwaMenuItemProps {
  className?: string;
}

export function InstallPwaMenuItem({ className }: InstallPwaMenuItemProps) {
  const { isInstallable, isInstalled, isIos, promptInstall } = usePwaInstall();

  // If already running inside standalone PWA mode, don't show the prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isInstallable) {
      await promptInstall();
    } else if (isIos) {
      toast.info("Install CineSpace on iOS", {
        description: "Tap the Share button in Safari (box with arrow) and tap 'Add to Home Screen'.",
        duration: 6000,
      });
    } else {
      toast.info("Install CineSpace App", {
        description: "Use your browser's menu (⋮ or ⊞) and select 'Install CineSpace' or 'Install App'.",
        duration: 5000,
      });
    }
  };

  return (
    <DropdownMenuItem
      onClick={handleInstallClick}
      className={
        className ||
        "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
      }
    >
      <Download className="size-4 text-emerald-500" />
      <TypographySpan variant="small" className="text-xs font-medium">
        Install CineSpace App
      </TypographySpan>
    </DropdownMenuItem>
  );
}
