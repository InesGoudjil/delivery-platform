"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
}

export function PageContainer({
  children,
  className,
  maxWidth = "7xl",
  ...props
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "w-full mx-auto space-y-8 p-4 sm:p-6 lg:p-8 transition-colors duration-200 text-foreground",
        maxWidthClasses[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6 transition-colors duration-200",
        className
      )}
      {...props}
    >
      <div className="space-y-1.5">
        {badge && (
          <Badge
            variant="outline"
            className="mb-1 text-xs font-mono font-semibold tracking-wider text-primary border-primary/30 bg-primary/10 uppercase rounded-full"
          >
            {badge}
          </Badge>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-heading">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-2xl font-sans leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}

export interface PageSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function PageSection({
  children,
  title,
  description,
  className,
  ...props
}: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-bold text-foreground font-heading">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export interface PageGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export function PageGrid({
  children,
  cols = 3,
  className,
  ...props
}: PageGridProps) {
  const gridColsClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div
      className={cn("grid gap-6", gridColsClasses[cols], className)}
      {...props}
    >
      {children}
    </div>
  );
}
