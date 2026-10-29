import React from "react";

export type MediaCardType = "video" | "photo" | "film" | "still" | "project";

export interface MediaCardWatermarkSettings {
  enabled?: boolean;
  text?: string;
  subtext?: string;
  variant?: "card" | "player" | "subtle";
  opacity?: number;
  className?: string;
  showBadge?: boolean;
}

export interface MediaCardProps {
  title?: string;
  subtitle?: string;
  src: string;
  alt?: string;
  type?: MediaCardType;
  aspectRatio?: string | number | null;
  numericRatio?: number | null;
  isMasonry?: boolean;
  thumbnailScale?: "fit" | "fill" | "Fit" | "Fill";
  onClick?: () => void;
  isHero?: boolean;
  isFeatured?: boolean;
  className?: string;
  containerClassName?: string;
  tiltIntensity?: number;
  glareIntensity?: number;

  // Text alignment for bottom overlay: "center" matches user inspiration screenshots
  textAlign?: "center" | "left";

  // Custom slots
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  centerAction?: React.ReactNode;
  bottomRight?: React.ReactNode;

  // Watermark
  watermarkMedia?: MediaCardWatermarkSettings;

  // Footer & presentation mode
  footerMode?: "overlay" | "card" | "none";
  showInfo?: boolean;
  showSubtitle?: boolean;
  showTitle?: boolean;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export interface MediaGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isMasonry?: boolean;
  cardSize?: "S" | "M" | "L";
  className?: string;
}
