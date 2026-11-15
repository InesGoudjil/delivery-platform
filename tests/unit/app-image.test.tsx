import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppImage,
  isServerRenderable,
  isStreamThumbnailUrl,
  resolveDisplayUrl,
  streamThumbnailLoader,
} from "@/components/ui/app-image";

const UID = "0123456789abcdef0123456789abcdef";
const SIGNED = "https://account.r2.cloudflarestorage.com/media-private/private/workspaces/w/still.jpg?X-Amz-Signature=abc";
const STREAM_THUMB = `https://customer-abc.cloudflarestream.com/${UID}/thumbnails/thumbnail.jpg?time=1s&height=720`;

describe("which images render on the server", () => {
  it("renders absolute URLs that need no rewriting, and local images", () => {
    expect(isServerRenderable(SIGNED, resolveDisplayUrl(SIGNED, true))).toBe(true);
    expect(isServerRenderable(STREAM_THUMB, resolveDisplayUrl(STREAM_THUMB, false))).toBe(true);
    expect(isServerRenderable("/images/hero.jpg", "/images/hero.jpg")).toBe(true);
  });

  it("leaves rewritten or proxied URLs to the browser, since they can depend on server-only settings", () => {
    expect(isServerRenderable(UID, resolveDisplayUrl(UID, false))).toBe(false);
    expect(isServerRenderable("workspaces/w/x.jpg", resolveDisplayUrl("workspaces/w/x.jpg", true))).toBe(false);
    expect(isServerRenderable("/api/media/private/x.jpg", "/api/media/private/x.jpg")).toBe(false);
    expect(isServerRenderable("//cdn.example.com/x.jpg", "//cdn.example.com/x.jpg")).toBe(false);
  });

  it("shows nothing for missing or placeholder sources", () => {
    expect(resolveDisplayUrl(null, true)).toBe("");
    expect(resolveDisplayUrl("  ", true)).toBe("");
    expect(resolveDisplayUrl("https://files.vidstack.io/sprite-fight/poster.webp", false)).toBe("");
  });
});

describe("Stream thumbnails", () => {
  it("are recognised on Stream's hosts only", () => {
    expect(isStreamThumbnailUrl(STREAM_THUMB)).toBe(true);
    expect(isStreamThumbnailUrl(`https://videodelivery.net/${UID}/thumbnails/thumbnail.jpg`)).toBe(true);
    expect(isStreamThumbnailUrl(`https://evil.example.com/${UID}/thumbnails/thumbnail.jpg`)).toBe(false);
    expect(isStreamThumbnailUrl(SIGNED)).toBe(false);
    expect(isStreamThumbnailUrl("not a url")).toBe(false);
  });

  it("are requested at the width needed instead of a fixed height", () => {
    const url = new URL(streamThumbnailLoader({ src: STREAM_THUMB, width: 640 }));
    expect(url.searchParams.get("width")).toBe("640");
    expect(url.searchParams.has("height")).toBe(false);
    expect(url.searchParams.get("time")).toBe("1s");
  });
});

describe("AppImage server markup", () => {
  it("renders the image itself instead of a 'No preview' placeholder", () => {
    const html = renderToStaticMarkup(<AppImage src={SIGNED} fallbackIcon="image" />);
    expect(html).toContain("<img");
    expect(html).toContain('src="https://account.r2.cloudflarestorage.com/');
    expect(html).not.toContain("No Image Preview");
    // Not dimmed behind a spinner until hydration.
    expect(html).not.toContain("animate-spin");
    expect(html).toContain("opacity-100");
  });

  it("gives Stream thumbnails a srcset of widths", () => {
    const html = renderToStaticMarkup(<AppImage src={STREAM_THUMB} sizes="33vw" />);
    expect(html).toMatch(/srcSet="[^"]*width=640[^"]*640w/);
    expect(html).not.toContain("height=720");
  });

  it("shows a neutral placeholder while a browser-resolved URL is pending", () => {
    const html = renderToStaticMarkup(<AppImage src={UID} />);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("No Video Preview");
    expect(html).toContain("animate-pulse");
  });

  it("still says there's no preview when there is no source", () => {
    expect(renderToStaticMarkup(<AppImage src={null} />)).toContain("No Video Preview");
  });
});
