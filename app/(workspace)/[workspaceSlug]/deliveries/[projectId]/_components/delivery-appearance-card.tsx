"use client";

import {
  Pencil,
  Lock,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  Grid,
  LayoutDashboard,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { AppearanceSettings } from "./types";

interface DeliveryAppearanceCardProps {
  settings: AppearanceSettings;
  onChangeSettings: (settings: AppearanceSettings) => void;
  canWatermark?: boolean;
  workspaceSlug?: string;
}

export function DeliveryAppearanceCard({
  settings,
  onChangeSettings,
  canWatermark = true,
  workspaceSlug,
}: DeliveryAppearanceCardProps) {
  const {
    cardSize,
    aspectRatioSetting,
    thumbnailScale,
    showCardInfo,
    watermarkMedia,
  } = settings;

  const update = (partial: Partial<AppearanceSettings>) => {
    onChangeSettings({ ...settings, ...partial });
  };

  return (
    <Card className="rounded-2xl border border-border shadow-lg hover:translate-y-0 hover:shadow-lg">
      <CardHeader className="border-b border-border/50 pb-4 flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Pencil className="size-4 text-primary" />
          <div>
            <CardTitle className="text-base font-bold font-heading text-card-foreground">
              Appearance
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Customize how your client sees and interacts with this gallery
            </CardDescription>
          </div>
        </div>

        <CardAction>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Lock className="size-3.5" />
            <span className="hidden sm:inline">
              How your client sees this gallery
            </span>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 text-xs font-medium">
        {/* Card size row */}
        <div className="flex items-center justify-between py-2 border-b border-border/40">
          <span className="text-muted-foreground font-sans">Card size</span>
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            {(["S", "M", "L"] as const).map((size) => (
              <Button
                key={size}
                type="button"
                variant={cardSize === size ? "default" : "ghost"}
                size="sm"
                onClick={() => update({ cardSize: size })}
                className={`h-7 px-3 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  cardSize === size
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        {/* Aspect ratio row */}
        <div className="flex items-center justify-between py-2 border-b border-border/40">
          <span className="text-muted-foreground font-sans">Aspect ratio</span>
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            <Button
              type="button"
              variant={aspectRatioSetting === "16:9" ? "default" : "ghost"}
              size="icon-xs"
              onClick={() => update({ aspectRatioSetting: "16:9" })}
              className={`rounded-lg cursor-pointer transition-all ${
                aspectRatioSetting === "16:9"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="16:9 Landscape"
            >
              <RectangleHorizontal className="size-4" />
            </Button>
            <Button
              type="button"
              variant={aspectRatioSetting === "1:1" ? "default" : "ghost"}
              size="icon-xs"
              onClick={() => update({ aspectRatioSetting: "1:1" })}
              className={`rounded-lg cursor-pointer transition-all ${
                aspectRatioSetting === "1:1"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="1:1 Square"
            >
              <Square className="size-4" />
            </Button>
            <Button
              type="button"
              variant={aspectRatioSetting === "9:16" ? "default" : "ghost"}
              size="icon-xs"
              onClick={() => update({ aspectRatioSetting: "9:16" })}
              className={`rounded-lg cursor-pointer transition-all ${
                aspectRatioSetting === "9:16"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="9:16 Vertical"
            >
              <RectangleVertical className="size-4" />
            </Button>
            <Button
              type="button"
              variant={aspectRatioSetting === "masonry" ? "default" : "ghost"}
              size="icon-xs"
              onClick={() => update({ aspectRatioSetting: "masonry" })}
              className={`rounded-lg cursor-pointer transition-all ${
                aspectRatioSetting === "masonry"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Masonry Grid"
            >
              <LayoutDashboard className="size-4" />

              {/* <Grid className="size-4" /> */}
            </Button>
          </div>
        </div>

        {/* Thumbnail scale row */}
        <div className="flex items-center justify-between py-2 border-b border-border/40">
          <span className="text-muted-foreground font-sans">
            Thumbnail scale
          </span>
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            {(["Fit", "Fill"] as const).map((scale) => (
              <Button
                key={scale}
                type="button"
                variant={thumbnailScale === scale ? "default" : "ghost"}
                size="sm"
                onClick={() => update({ thumbnailScale: scale })}
                className={`h-7 px-3.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  thumbnailScale === scale
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {scale}
              </Button>
            ))}
          </div>
        </div>

        {/* Show card info row */}
        <div className="flex items-center justify-between py-2 border-b border-border/40">
          <span className="text-muted-foreground font-sans">
            Show card info
          </span>
          <Switch
            checked={showCardInfo}
            onCheckedChange={(checked) =>
              update({ showCardInfo: Boolean(checked) })
            }
          />
        </div>

        {/* Watermark media PRO row */}
        <div className="flex items-center justify-between py-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={`font-sans text-xs ${canWatermark ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                Watermark media
              </span>
              <Badge
                variant="orange"
                className="text-[9px] px-1.5 py-0.5 font-bold"
              >
                PRO
              </Badge>
            </div>
            {!canWatermark && (
              <Link
                href={workspaceSlug ? `/${workspaceSlug}/subscription` : "#"}
                className="text-[10px] text-primary hover:underline font-mono"
              >
                Upgrade to Pro to enable watermarking
              </Link>
            )}
          </div>
          <Switch
            checked={canWatermark && watermarkMedia}
            disabled={!canWatermark}
            onCheckedChange={(checked) =>
              update({ watermarkMedia: Boolean(checked) })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
