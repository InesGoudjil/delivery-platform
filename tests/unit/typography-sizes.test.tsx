import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Typography,
  TypographyH1,
  TypographyH2,
  TypographyH4,
  TypographyLead,
  TypographySpan,
} from "@/components/ui/typography";

/** The classes the element renders with. */
function classesOf(element: React.ReactElement): string[] {
  const match = /class="([^"]*)"/.exec(renderToStaticMarkup(element));
  return match ? match[1].split(/\s+/) : [];
}

describe("Typography sizes", () => {
  it("keeps the variant's responsive sizes when the page sets none", () => {
    expect(classesOf(<TypographyH1>Title</TypographyH1>)).toEqual(
      expect.arrayContaining(["text-4xl", "sm:text-6xl", "md:text-7xl"])
    );
  });

  it("uses the page's own size at every width", () => {
    const classes = classesOf(<TypographyH1 className="text-3xl font-bold">Title</TypographyH1>);
    expect(classes).toContain("text-3xl");
    expect(classes.filter((c) => /^(sm|md|lg|xl):text-/.test(c))).toEqual([]);
  });

  it("keeps the page's own sm:/lg: sizes, and drops the variant's md: one", () => {
    const classes = classesOf(<TypographyH2 className="text-2xl sm:text-4xl lg:text-5xl">Title</TypographyH2>);
    expect(classes).toEqual(expect.arrayContaining(["text-2xl", "sm:text-4xl", "lg:text-5xl"]));
    expect(classes).not.toContain("md:text-5xl");
  });

  it("treats arbitrary sizes as sizes, and text colours as colours", () => {
    expect(classesOf(<TypographyH4 className="text-[13px]">Title</TypographyH4>)).not.toContain("sm:text-2xl");
    expect(classesOf(<TypographyH4 className="text-white">Title</TypographyH4>)).toContain("sm:text-2xl");
  });

  it("applies to a heading variant passed to TypographySpan", () => {
    const classes = classesOf(
      <TypographySpan variant="h2" className="text-3xl">
        $29
      </TypographySpan>
    );
    expect(classes).not.toContain("md:text-5xl");
  });

  it("applies to body variants too", () => {
    expect(classesOf(<TypographyLead>Lead</TypographyLead>)).toContain("sm:text-lg");
    expect(classesOf(<TypographyLead className="text-sm">Lead</TypographyLead>)).not.toContain("sm:text-lg");
    expect(classesOf(<Typography className="text-3xl font-extrabold">8</Typography>)).not.toContain("sm:text-base");
  });
});
