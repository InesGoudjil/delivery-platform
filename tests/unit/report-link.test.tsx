import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportLink } from "@/components/report-link";

describe("ReportLink", () => {
  it("opens an email to the reports inbox with a subject and a place for the page link", () => {
    const html = renderToStaticMarkup(<ReportLink />);
    expect(html).toContain("Report a problem");
    expect(html).toMatch(/href="mailto:[^"?]+@[^"?]+\?subject=Report%3A%20content%20on%20CineSpace&amp;body=/);
  });
});
