"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const universalDialogSizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  full: "sm:max-w-[calc(100vw-2rem)] sm:h-[calc(100dvh-2rem)]",
} as const;

export type UniversalDialogSize = keyof typeof universalDialogSizes;

export type UniversalDialogVariant = "default" | "destructive" | "warning";

interface UniversalDialogRootProps extends DialogPrimitive.Root.Props {}

function UniversalDialogRoot({ ...props }: UniversalDialogRootProps) {
  return <DialogPrimitive.Root data-slot="universal-dialog" {...props} />;
}

function UniversalDialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="universal-dialog-trigger" {...props} />;
}

function UniversalDialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="universal-dialog-portal" {...props} />;
}

function UniversalDialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="universal-dialog-close" {...props} />;
}

function UniversalDialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="universal-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/75 backdrop-blur-md duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

export interface UniversalDialogContentProps
  extends DialogPrimitive.Popup.Props {
  size?: UniversalDialogSize;
  variant?: UniversalDialogVariant;
  showCloseButton?: boolean;
  overlayClassName?: string;
}

function UniversalDialogContent({
  className,
  children,
  size = "md",
  variant = "default",
  showCloseButton = true,
  overlayClassName,
  ...props
}: UniversalDialogContentProps) {
  return (
    <UniversalDialogPortal>
      <UniversalDialogOverlay className={overlayClassName} />
      <DialogPrimitive.Popup
        data-slot="universal-dialog-content"
        className={cn(
          "liquid-glass modal fixed top-1/2 left-1/2 z-50 flex flex-col w-full max-w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl text-[#f6f3ec] duration-200 outline-none max-h-[calc(100dvh-2rem)] overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          variant === "destructive"
            ? "border-red-500/35 shadow-[0_28px_64px_-20px_rgba(239,68,68,0.25),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_0_0_1px_rgba(239,68,68,0.2)]"
            : variant === "warning"
            ? "border-amber-500/35 shadow-[0_28px_64px_-20px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_0_0_1px_rgba(245,158,11,0.2)]"
            : "border-white/15 shadow-[0_28px_64px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
          universalDialogSizes[size],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="universal-dialog-close-button"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 size-8 rounded-full bg-white/5 hover:bg-white/15 text-[#aeaeb4] hover:text-white flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </UniversalDialogPortal>
  );
}

export interface UniversalDialogHeaderProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: UniversalDialogVariant;
}

function UniversalDialogHeader({
  className,
  icon,
  badge,
  title,
  description,
  variant = "default",
  children,
  ...props
}: UniversalDialogHeaderProps) {
  return (
    <div
      data-slot="universal-dialog-header"
      className={cn(
        "flex items-start justify-between gap-4 p-5 sm:p-6 pb-4 border-b border-white/10 shrink-0 pr-12",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {icon && (
          <div
            className={cn(
              "size-10 sm:size-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner mt-0.5",
              variant === "destructive"
                ? "bg-red-500/15 border-red-500/30 text-red-400"
                : variant === "warning"
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-white/5 border-white/15 text-white"
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1 flex-1">
          {badge && <div className="mb-1.5">{badge}</div>}
          {title && (
            typeof title === "string" ? (
              <UniversalDialogTitle>{title}</UniversalDialogTitle>
            ) : (
              title
            )
          )}
          {description && (
            typeof description === "string" ? (
              <UniversalDialogDescription>{description}</UniversalDialogDescription>
            ) : (
              description
            )
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function UniversalDialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="universal-dialog-title"
      className={cn(
        "font-heading text-lg sm:text-xl font-bold tracking-wide text-white leading-tight",
        className
      )}
      {...props}
    />
  );
}

function UniversalDialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="universal-dialog-description"
      className={cn(
        "text-xs sm:text-sm text-[#aeaeb4] leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

function UniversalDialogBody({
  className,
  scrollable = true,
  ...props
}: React.ComponentProps<"div"> & {
  scrollable?: boolean;
}) {
  return (
    <div
      data-slot="universal-dialog-body"
      className={cn(
        "p-5 sm:p-6",
        scrollable && "flex-1 min-h-0 overflow-y-auto overscroll-contain",
        className
      )}
      {...props}
    />
  );
}

function UniversalDialogFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="universal-dialog-footer"
      className={cn(
        "border-t border-white/10 bg-white/[0.02] p-4 sm:p-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 rounded-b-3xl shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface UniversalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: UniversalDialogSize;
  variant?: UniversalDialogVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  scrollable?: boolean;
  overlayClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  children: React.ReactNode;
}

export function UniversalDialog({
  open,
  onOpenChange,
  size = "md",
  variant = "default",
  title,
  description,
  icon,
  badge,
  headerExtra,
  footer,
  showCloseButton = true,
  scrollable = true,
  overlayClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  children,
}: UniversalDialogProps) {
  const hasHeader = Boolean(title || description || icon || badge || headerExtra);

  return (
    <UniversalDialogRoot open={open} onOpenChange={onOpenChange}>
      <UniversalDialogContent
        size={size}
        variant={variant}
        showCloseButton={showCloseButton}
        overlayClassName={overlayClassName}
        className={contentClassName}
      >
        {hasHeader && (
          <UniversalDialogHeader
            icon={icon}
            badge={badge}
            title={title}
            description={description}
            variant={variant}
            className={headerClassName}
          >
            {headerExtra}
          </UniversalDialogHeader>
        )}
        <UniversalDialogBody scrollable={scrollable} className={bodyClassName}>
          {children}
        </UniversalDialogBody>
        {footer && (
          <UniversalDialogFooter className={footerClassName}>
            {footer}
          </UniversalDialogFooter>
        )}
      </UniversalDialogContent>
    </UniversalDialogRoot>
  );
}

UniversalDialog.Root = UniversalDialogRoot;
UniversalDialog.Trigger = UniversalDialogTrigger;
UniversalDialog.Portal = UniversalDialogPortal;
UniversalDialog.Overlay = UniversalDialogOverlay;
UniversalDialog.Content = UniversalDialogContent;
UniversalDialog.Header = UniversalDialogHeader;
UniversalDialog.Title = UniversalDialogTitle;
UniversalDialog.Description = UniversalDialogDescription;
UniversalDialog.Body = UniversalDialogBody;
UniversalDialog.Footer = UniversalDialogFooter;
UniversalDialog.Close = UniversalDialogClose;

export {
  UniversalDialogRoot,
  UniversalDialogTrigger,
  UniversalDialogPortal,
  UniversalDialogOverlay,
  UniversalDialogContent,
  UniversalDialogHeader,
  UniversalDialogTitle,
  UniversalDialogDescription,
  UniversalDialogBody,
  UniversalDialogFooter,
  UniversalDialogClose,
};
