import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  href?: string | null;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => void;
  className?: string;
  imgClassName?: string;
  alt?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  xs: "h-4 w-auto",
  sm: "h-5 w-auto",
  md: "h-6 w-auto",
  lg: "h-6 sm:h-7 w-auto",
  xl: "h-7 sm:h-8 w-auto",
};

export function BrandLogo({
  size = "md",
  href = "/",
  onClick,
  className,
  imgClassName,
  alt = "CineSpace",
}: BrandLogoProps) {
  const imageElement = (
    <img
      src="/images/logo.svg"
      alt={alt}
      className={cn("block object-contain select-none", SIZE_CLASSES[size], imgClassName)}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        className={cn(
          "inline-flex items-center transition-opacity hover:opacity-90 focus:outline-none",
          className
        )}
      >
        {imageElement}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick as React.MouseEventHandler<HTMLDivElement>}
      className={cn("inline-flex items-center", className)}
    >
      {imageElement}
    </div>
  );
}
