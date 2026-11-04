import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Typography,
  TypographySpan,
  TypographyH1,
  TypographyP,
  TypographyMuted,
  TypographySmall,
  TypographyKicker,
} from "@/components/ui/typography";

describe("Typography Component & TypographySpan", () => {
  it("exports TypographySpan function", () => {
    expect(typeof TypographySpan).toBe("function");
  });

  it("renders TypographySpan as a span element by default with font-sans", () => {
    const html = renderToStaticMarkup(
      React.createElement(TypographySpan, null, "Inline text")
    );
    expect(html).toContain("<span");
    expect(html).toContain("</span>");
    expect(html).toContain("Inline text");
    expect(html).toContain("font-sans");
  });

  it("applies variant and color to TypographySpan", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        TypographySpan,
        { variant: "small", color: "orange", className: "custom-class" },
        "Orange small span"
      )
    );
    expect(html).toContain("<span");
    expect(html).toContain("text-primary");
    expect(html).toContain("text-xs");
    expect(html).toContain("custom-class");
    expect(html).toContain("font-sans");
  });

  it("supports variant='span' with Typography", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        Typography,
        { variant: "span", color: "muted" },
        "Muted span text"
      )
    );
    expect(html).toContain("<span");
    expect(html).toContain("text-[#9a9a9f]");
    expect(html).toContain("Muted span text");
  });

  it("renders other typography convenience helpers correctly", () => {
    const h1Html = renderToStaticMarkup(
      React.createElement(TypographyH1, null, "Heading 1")
    );
    expect(h1Html).toContain("<h1");
    expect(h1Html).toContain("font-heading");

    const pHtml = renderToStaticMarkup(
      React.createElement(TypographyP, null, "Paragraph")
    );
    expect(pHtml).toContain("<p");
    expect(pHtml).toContain("font-sans");

    const kickerHtml = renderToStaticMarkup(
      React.createElement(TypographyKicker, null, "Kicker")
    );
    expect(kickerHtml).toContain("<span");
    expect(kickerHtml).toContain("uppercase");
  });
});
