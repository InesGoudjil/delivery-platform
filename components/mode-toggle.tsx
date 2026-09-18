"use client";

import * as React from "react";
import { Moon, Sun, Check, Laptop } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center relative outline-none"
        title="Toggle theme"
      >
        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-36 bg-popover border border-border text-popover-foreground p-1 rounded-xl shadow-xl z-50"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Sun className="size-3.5" />
            <span>Light</span>
          </div>
          {theme === "light" && <Check className="size-3 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Moon className="size-3.5" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <Check className="size-3 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Laptop className="size-3.5" />
            <span>System</span>
          </div>
          {theme === "system" && <Check className="size-3 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ThemeToggle = ModeToggle;
