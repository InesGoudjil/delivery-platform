"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast liquid-glass group-[.toaster]:liquid-glass group-[.toaster]:!absolute group-[.toaster]:text-foreground group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:font-sans group-[.toaster]:text-xs",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl font-medium",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-foreground group-[.toast]:rounded-xl group-[.toast]:hover:bg-white/20",
          closeButton:
            "group-[.toast]:bg-white/10 group-[.toast]:border-white/20 group-[.toast]:text-foreground group-[.toast]:hover:bg-white/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
export type { ToasterProps };
