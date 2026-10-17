import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Embedded Base64 Data URI of the CineSpace logo SVG (public/images/logo.svg).
 * Embedding this ensures instant, zero-latency masking without an extra HTTP round-trip
 * when the loader is displayed on initial hydration or page transitions.
 */
const CINESPACE_LOGO_DATA_URI =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+Cjxzdmcgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgdmlld0JveD0iMCAwIDg1NCAxODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM6c2VyaWY9Imh0dHA6Ly93d3cuc2VyaWYuY29tLyIgc3R5bGU9ImZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtbWl0ZXJsaW1pdDoyOyI+CiAgICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLC0yODE2LjgxLC00NTAuMDcxKSI+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMjgzLjY2LDApIj4KICAgICAgICAgICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwwLDAsMSwyMDMuMTU4LDcuMTA3ODQpIj4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0zOTUuMzE3LDU4MS41NjZDNDI4Ljc5Miw1ODEuNTY2IDQ1My43NjIsNTYxLjg0MyA0NTguNDY2LDUzMS45ODdMNDI4LjA2OCw1MzEuOTg3QzQyNC40NDksNTQ1LjE5NiA0MTIuMzI2LDU1My4zMzkgMzk1Ljg2LDU1My4zMzlDMzc0LjMyOCw1NTMuMzM5IDM2MC45MzgsNTM3LjU5NyAzNjAuOTM4LDUxMi40NDZDMzYwLjkzOCw0ODYuOTMyIDM3NC4xNDcsNDcxLjU1MiAzOTUuODYsNDcxLjU1MkM0MTEuOTY0LDQ3MS41NTIgNDIzLjM2Myw0NzkuMTUyIDQyNy4zNDQsNDkyLjU0Mkw0NTguMjg2LDQ5Mi41NDJDNDU0LjEyNCw0NjIuNTA1IDQzMC4wNTgsNDQzLjMyNSAzOTYuNTg0LDQ0My4zMjVDMzU2LjU5NSw0NDMuMzI1IDMyOS45OTcsNDcwLjgyOSAzMjkuOTk3LDUxMi42MjZDMzI5Ljk5Nyw1NTQuOTY3IDM1NS4xNDgsNTgxLjU2NiAzOTUuMzE3LDU4MS41NjZaIiBzdHlsZT0iZmlsbDpyZ2IoMjQ1LDg1LDI5KTtmaWxsLXJ1bGU6bm9uemVybzsiLz4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik00NzkuMjc1LDQ3NC44MDlDNDg3Ljk2LDQ3NC44MDkgNjk0LjUwNiw0NjcuNzUyIDY5NC41MDYsNDU4Ljg4NkM2OTQuNTA2LDQ1MC4wMiA0ODcuOTYsNDQzLjE0NCA0NzkuMjc1LDQ0My4xNDRDNDcwLjQwOSw0NDMuMTQ0IDQ2My4zNTIsNDUwLjAyIDQ2My4zNTIsNDU4Ljg4NkM0NjMuMzUyLDQ2Ny43NTIgNDcwLjQwOSw0NzQuODA5IDQ3OS4yNzUsNDc0LjgwOVpNNDY1LjUyMyw1NzkuMzk1TDQ5My4zODksNTc5LjM5NUw0OTMuMzg5LDQ4OC45MjNMNDY1LjUyMyw0ODguOTIzTDQ2NS41MjMsNTc5LjM5NVoiIHN0eWxlPSJmaWxsOnJnYigyNDUsODUsMjkpO2ZpbGwtcnVsZTpub256ZXJvOyIvPgogICAgICAgICAgICAgICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoLTEsLTEuMjI0NjVlLTE2LDEuMjI0NjVlLTE2LC0xLDE2NDcuMDQsMTA2NS45NykiPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik00NzkuMjc1LDQ3NC44MDlDNDg3Ljk2LDQ3NC44MDkgNjk0LjUwNiw0NjcuNzUyIDY5NC41MDYsNDU4Ljg4NkM2OTQuNTA2LDQ1MC4wMiA0ODcuOTYsNDQzLjE0NCA0NzkuMjc1LDQ0My4xNDRDNDcwLjQwOSw0NDMuMTQ0IDQ2My4zNTIsNDUwLjAyIDQ2My4zNTIsNDU4Ljg4NkM2OTMuMzUyLDQ2Ny43NTIgNDcwLjQwOSw0NzQuODA5IDQ3OS4yNzUsNDc0LjgwOVoiIHN0eWxlPSJmaWxsOnJnYigyNDUsODUsMjkpO2ZpbGwtcnVsZTpub256ZXJvOyIvPgogICAgICAgICAgICAgICAgPC9nPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTUzMy4xOTYsNTc5LjM5NUw1MzMuMTk2LDUyOS44MTZDNTMzLjE5Niw1MTguNTk4IDU0MC4yNTMsNTExLjM2IDU1MS4yOTEsNTExLjM2QzU2MC44ODEsNTExLjM2IDU2Ny4yMTQsNTE4Ljc3OSA1NjcuMjE0LDUzMC4xNzhMNTY3LjIxNCw1NzkuMzk1TDU5NS4wNzksNTc5LjM5NUw1OTUuMDc5LDUyMy40ODNDNTk1LjA3OSw0OTkuNzc5IDU4Mi41OTQsNDg2LjAyOCA1NjEuMDYxLDQ4Ni4wMjhDNTQ5LjMsNDg2LjAyOCA1MzguOTg2LDQ5MC41NTEgNTMzLjM3Nyw0OTguMzMyTDUzMS41NjgsNDg4LjkyM0w1MDUuMzMxLDQ4OC45MjNMNTA1LjMzMSw1NzkuMzk1TDUzMy4xOTYsNTc5LjM5NVoiIHN0eWxlPSJmaWxsOnJnYigyNDUsODUsMjkpO2ZpbGwtcnVsZTpub256ZXJvOyIvPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTY0Ny45MTQsNTgxLjc0N0M2NzIuNzA0LDU4MS43NDcgNjkwLjYxNyw1NjguOSA2OTMuODc0LDU0OC44MTVMNjY4LjM2MSw1NDguODE1QzY2Ni4zNzEsNTU1LjMyOSA2NTguOTUyLDU1OS4xMjkgNjQ4LjQ1Nyw1NTkuMTI5QzYzNi4xNTMsNTU5LjEyOSA2MjkuNDU4LDU1My41MiA2MjcuODMsNTQxLjU3N0w2OTMuNTEyLDU0MS4yMTZMNjkzLjUxMiw1MzQuMTU5QzY5My41MTIsNTA0LjY2NSA2NzUuNzgsNDg2LjAyOCA2NDcuMzcyLDQ4Ni4wMjhDNjIwLjA0OSw0ODYuMDI4IDYwMS4wNSw1MDUuNzUxIDYwMS4wNSw1MzMuOTc4QzYwMS4wNSw1NjEuODQzIDYyMC41OTIsNTgxLjc0NyA2NDcuOTE0LDU4MS43NDdaTTY0Ny41NTMsNTA4LjY0NkM2NTguNzcxLDUwOC42NDYgNjY1LjgyOCw1MTQuNzk4IDY2NS44MjgsNTI0LjM4OEw2MjguMTkyLDUyNC4zODhDNjMwLjM2Myw1MTMuNTMxIDYzNi41MTUsNTA4LjY0NiA2NDcuNTUzLDUwOC42NDZaIiBzdHlsZT0iZmlsbDpyZ2IoMjQ1LDg1LDI5KTtmaWxsLXJ1bGU6bm9uemVybzsiLz4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik02OTYuOTUsNDg0LjM5OUM2OTYuOTUsNTA2LjI5MyA3MDkuMjU0LDUxOS44NjQgNzMzLjEzOSw1MjQuNzVMNzUzLjU4NSw1MjguOTExQzc2Mi40NTIsNTMwLjcyMSA3NjUuODksNTM0LjUyMSA3NjUuODksNTQxLjkzOUM3NjUuODksNTUwLjQ0NCA3NTcuNTY2LDU1NS42OTEgNzQ0LjM1Nyw1NTUuNjkxQzczMS4zMjksNTU1LjY5MSA3MjQuMDkyLDU1MC4yNjMgNzI0LjA5Miw1NDAuNDkyTDY5NC45Niw1NDAuNDkyQzY5NC45Niw1NjUuNjQzIDcxNC4zMjEsNTgxLjc0NyA3NDQuMTc2LDU4MS43NDdDNzc0LjkzNyw1ODEuNzQ3IDc5NS4yMDIsNTY0LjkxOSA3OTUuMjAyLDUzOS4wNDRDNzk1LjIwMiw1MTcuODc0IDc4My44MDMsNTA2LjQ3NCA3NTkuOTE4LDUwMS41ODlMNzM5LjgzNCw0OTcuNDI3QzczMC40MjUsNDk1LjQzNyA3MjYuMjYzLDQ5MS40NTYgNzI2LjI2Myw0ODMuMzE0QzcyNi4yNjMsNDc0LjQ0NyA3MzMuODYzLDQ2OS4wMTkgNzQ1LjgwNSw0NjkuMDE5Qzc1Ni44NDIsNDY5LjAxOSA3NjMuODk5LDQ3NC44MDkgNzYzLjg5OSw0ODQuMjE4TDc5My4wMzEsNDg0LjIxOEM3OTMuMDMxLDQ1OC44ODYgNzc0LjkzNyw0NDIuOTYzIDc0Ni4xNjcsNDQyLjk2M0M3MTcuMzk3LDQ0Mi45NjMgNjk2Ljk1LDQ2MC4xNTMgNjk2Ljk1LDQ4NC4zOTlaIiBzdHlsZT0iZmlsbDpyZ2IoMjQ1LDg1LDI5KTtmaWxsLXJ1bGU6bm9uemVybzsiLz4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik04MDIuMDc4LDYyMi44MjFMODI5Ljk0NCw2MjIuODIxTDgyOS45NDQsNTcwLjM0N0M4MzUuMTkxLDU3Ny4yMjMgODQ2Ljc3MSw1ODEuOTI4IDg1OS4yNTcsNTgxLjkyOEM4ODYuMjE3LDU4MS45MjggOTAxLjc3OCw1NjEuMyA5MDEuNzc4LDUzMi43MTFDOTAxLjc3OCw1MDMuNTc5IDg4NC4yMjcsNDg2LjAyOCA4NTkuMDc2LDQ4Ni4wMjhDODQ2LjIyOSw0ODYuMDI4IDgzNC44MjksNDkxLjYzNyA4MjkuNzYzLDQ5OS45Nkw4MjguMzE1LDQ4OC45MjNMODAyLjA3OCw0ODguOTIzTDgwMi4wNzgsNjIyLjgyMVpNODMwLjEyNSw1MzQuMTU5QzgzMC4xMjUsNTIwLjU4OCA4MzkuMTcyLDUxMS41NDEgODUyLjIsNTExLjU0MUM4NjUuNDA5LDUxMS41NDEgODczLjczMiw1MjAuNzY5IDg3My43MzIsNTM0LjE1OUM4NzMuNzMyLDU0Ny41NDkgODY1LjQwOSw1NTYuNzc3IDg1Mi4yLDU1Ni43NzdDODM5LjE3Miw1NTYuNzc3IDgzMC4xMjUsNTQ3LjczIDgzMC4xMjUsNTM0LjE1OVoiIHN0eWxlPSJmaWxsOnJnYigyNDUsODUsMjkpO2ZpbGwtcnVsZTpub256ZXJvOyIvPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTkzNi4xNTgsNTgxLjc0N0M5NDkuNzI4LDU4MS43NDcgOTYxLjY3MSw1NzUuNzc2IDk2NC41NjYsNTY3LjQ1Mkw5NjYuMzc1LDU3OS4zOTVMOTkwLjk4Myw1NzkuMzk1TDk5MC45ODMsNTI2LjU1OUM5OTAuOTgzLDUwMC42ODQgOTc2LjE0Niw0ODYuMDI4IDk0OS45MDksNDg2LjAyOEM5MjQuMDM0LDQ4Ni4wMjggOTA3LjIwNyw0OTkuNDE4IDkwNy4yMDcsNTE5Ljg2NEw5MzAuMzY3LDUxOS44NjRDOTMwLjM2Nyw1MTEuNzIyIDkzNi43LDUwNy4xOTggOTQ4LjQ2Miw1MDcuMTk4Qzk1OC40MTQsNTA3LjE5OCA5NjMuODQyLDUxMS45MDMgOTYzLjg0Miw1MjAuNzY5TDk2My44NDIsNTIyLjIxNkw5MzguNTEsNTI0LjIwN0M5MTYuNzk3LDUyNS44MzUgOTA1LjAzNSw1MzYuMTQ5IDkwNS4wMzUsNTUyLjc5NkM5MDUuMDM1LDU3MC41MjggOTE2Ljk3OCw1ODEuNzQ3IDkzNi4xNTgsNTgxLjc0N1pNOTQ1LjkyOCw1NjEuMTE5QzkzNy40MjQsNTYxLjExOSA5MzMuNDQzLDU1OC4wNDMgOTMzLjQ0Myw1NTEuNTI5QzkzMy40NDMsNTQ1LjczOSA5MzcuNzg2LDU0My4wMjUgOTQ5LjkwOSw1NDEuOTM5TDk2NC4wMjMsNTQwLjY3M0w5NjQuMDIzLDU0NS41NThDOTY0LjAyMyw1NTUuODcyIDk1Ni42MDQsNTYxLjExOSA5NDUuOTI4LDU2MS4xMTlaIiBzdHlsZT0iZmlsbDpyZ2IoMjQ1LDg1LDI5KTtmaWxsLXJ1bGU6bm9uemVybzsiLz4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik05OTYuOTU1LDUzMy43OTdDOTk2Ljk1NSw1NjIuNzQ4IDEwMTUuNDEsNTgxLjc0NyAxMDQ0LDU4MS43NDdDMTA2OS4zMyw1ODEuNzQ3IDEwODcuNzksNTY2LjE4NiAxMDg5LjYsNTQzLjM4N0wxMDYxLjU1LDU0My4zODdDMTA1OS43NCw1NTIuMjUzIDEwNTMuNzcsNTU2Ljc3NyAxMDQ0LDU1Ni43NzdDMTAzMi4wNiw1NTYuNzc3IDEwMjUsNTQ4LjI3MiAxMDI1LDUzMy43OTdDMTAyNSw1MTkuODY0IDEwMzIuNiw1MTAuOTk4IDEwNDQuMzYsNTEwLjk5OEMxMDUzLjk1LDUxMC45OTggMTA1OS41Niw1MTUuMzQxIDEwNjEuNTUsNTI0LjM4OEwxMDg5LjYsNTI0LjM4OEMxMDg3Ljc5LDUwMC42ODQgMTA3MC4wNiw0ODYuMDI4IDEwNDMuMjgsNDg2LjAyOEMxMDE2LjEzLDQ4Ni4wMjggOTk2Ljk1NSw1MDUuOTMyIDk5Ni45NTUsNTMzLjc5N1oiIHN0eWxlPSJmaWxsOnJnYigyNDUsODUsMjkpO2ZpbGwtcnVsZTpub256ZXJvOyIvPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTExMzcuNzMsNTgxLjc0N0MxMTYyLjUyLDU4MS43NDcgMTE4MC40Myw1NjguOSAxMTgzLjY5LDU0OC44MTVMMTE1OC4xNyw1NDguODE1QzExNTYuMTgsNTU1LjMyOSAxMTQ4Ljc3LDU1OS4xMjkgMTEzOC4yNyw1NTkuMTI5QzExMjUuOTcsNTU5LjEyOSAxMTE5LjI3LDU1My41MiAxMTE3LjY0LDU0MS41NzdMMTE4My4zMyw1NDEuMjE2TDExODMuMzMsNTM0LjE1OUMxMTgzLjMzLDUwNC42NjUgMTE2NS41OSw0ODYuMDI4IDExMzcuMTksNDg2LjAyOEMxMTA5Ljg2LDQ4Ni4wMjggMTA5MC44Niw1MDUuNzUxIDEwOTAuODYsNTMzLjk3OEMxMDkwLjg2LDU2MS44NDMgMTExMC40MSw1ODEuNzQ3IDExMzcuNzMsNTgxLjc0N1pNMTEzNy4zNyw1MDguNjQ2QzExNDguNTksNTA4LjY0NiAxMTU1LjY0LDUxNC43OTggMTE1NS42NCw1MjQuMzg4TDExMTguMDEsNTI0LjM4OEMxMTIwLjE4LDUxMy41MzEgMTEyNi4zMyw1MDguNjQ2IDExMzcuMzcsNTA4LjY0NloiIHN0eWxlPSJmaWxsOnJnYigyNDUsODUsMjkpO2ZpbGwtcnVsZTpub256ZXJvOyIvPgogICAgICAgICAgICA8L2c+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4K";

export interface CineSpaceLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true, renders full-screen with fixed positioning, dark cinematic backdrop, and ambient glow.
   * If false, renders as a container-friendly inline loader for modals or page sections.
   * @default true
   */
  fullScreen?: boolean;

  /**
   * Size presets for the wordmark and progress bar.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";

  /**
   * Whether to display the ambient pulsing background glow.
   * Defaults to true in fullScreen mode, false when embedded inline.
   */
  showAmbient?: boolean;

  /**
   * Whether to display the sliding brand gradient progress bar beneath the wordmark.
   * @default true
   */
  showBar?: boolean;

  /**
   * Optional caption, label, or status message. Supports formatted JSX or string.
   */
  caption?: React.ReactNode;

  /**
   * Optional custom logo mask URI. If omitted, uses the embedded CineSpace wordmark.
   */
  logoUrl?: string;

  /**
   * Optional custom class name for the wordmark element.
   */
  markClassName?: string;
}

const SIZE_VARIANTS = {
  sm: {
    mark: "w-[130px] max-w-[45vw]",
    bar: "w-[160px] max-w-[50vw] h-[2.5px]",
    cap: "text-[10px] tracking-[0.2em] -mt-1.5",
    gap: "gap-4",
  },
  md: {
    mark: "w-[180px] max-w-[50vw]",
    bar: "w-[220px] max-w-[55vw] h-[3px]",
    cap: "text-[12px] tracking-[0.22em] -mt-2.5",
    gap: "gap-7",
  },
  lg: {
    mark: "w-[240px] max-w-[65vw]",
    bar: "w-[280px] max-w-[70vw] h-[3.5px]",
    cap: "text-[13px] tracking-[0.24em] -mt-3",
    gap: "gap-8",
  },
};

export function CineSpaceLoader({
  fullScreen = true,
  size = "md",
  showAmbient,
  showBar = true,
  caption,
  logoUrl,
  className,
  markClassName,
  style,
  children,
  ...props
}: CineSpaceLoaderProps) {
  const isAmbientVisible = showAmbient ?? fullScreen;
  const variant = SIZE_VARIANTS[size] || SIZE_VARIANTS.md;
  const logoValue = logoUrl ? `url('${logoUrl}')` : `url('${CINESPACE_LOGO_DATA_URI}')`;

  const content = (
    <div
      className={cn("cs-loader", variant.gap)}
      style={
        {
          "--cs-loader-logo": logoValue,
          "--logo": logoValue,
        } as React.CSSProperties
      }
    >
      {/* 1. CineSpace Wordmark with masked glow & liquid metallic sweep */}
      <div className={cn("cs-loader-mark", variant.mark, markClassName)}>
        <div className="cs-loader-mark-layer cs-loader-mark-base" />
        <div className="cs-loader-mark-layer cs-loader-mark-fill" />
        <div className="cs-loader-mark-layer cs-loader-mark-shine" />
      </div>

      {/* 2. Sliding progress bar */}
      {showBar && <div className={cn("cs-loader-bar", variant.bar)} />}

      {/* 3. Status caption / label */}
      {(caption || children) && (
        <div className={cn("cs-loader-cap font-body", variant.cap)}>
          {caption ?? children}
        </div>
      )}
    </div>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        typeof caption === "string"
          ? caption
          : "CineSpace loading"
      }
      className={cn(
        "relative flex flex-col items-center justify-center select-none",
        fullScreen
          ? "fixed inset-0 z-50 min-h-dvh w-screen overflow-hidden bg-[#0A0A0B] text-white"
          : "w-full py-10",
        className
      )}
      style={style}
      {...props}
    >
      {isAmbientVisible && <div className="cs-loader-amb" />}
      {content}
    </div>
  );
}

export default CineSpaceLoader;
