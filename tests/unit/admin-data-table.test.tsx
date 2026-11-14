import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminDataTable } from "@/app/(admin)/_components/admin-data-table";

/**
 * The admin lists' shared table, rendered on the server as the admin pages render it: rows,
 * totals and sort state come from the page; the URL state comes from nuqs.
 */

type Row = { id: string; name: string; deliveries: number };

const columns: ColumnDef<Row, unknown>[] = [
  {
    id: "name",
    header: "Workspace",
    meta: { sortKey: "brand_name", sortFirst: "asc" },
    cell: ({ row }) => row.original.name,
  },
  {
    id: "deliveries",
    header: "Deliveries",
    meta: { sortKey: "deliveries" },
    cell: ({ row }) => String(row.original.deliveries),
  },
  { id: "note", header: "Note", cell: () => "—" },
];

const rows: Row[] = [
  { id: "w1", name: "Studio A", deliveries: 3 },
  { id: "w2", name: "Studio B", deliveries: 1 },
];

function render(props: Partial<React.ComponentProps<typeof AdminDataTable<Row>>>, searchParams = "") {
  return renderToStaticMarkup(
    <NuqsTestingAdapter searchParams={searchParams}>
      <AdminDataTable<Row>
        columns={columns}
        rows={rows}
        total={2}
        page={1}
        pageSize={25}
        getRowId={(row) => row.id}
        {...props}
      />
    </NuqsTestingAdapter>
  );
}

describe("AdminDataTable", () => {
  it("renders the page of rows the server sent, with the range, total and page count", () => {
    const html = render({ total: 30, page: 2 }, "?page=2");
    expect(html).toContain("Studio A");
    expect(html).toContain("Studio B");
    expect(html).toContain("26–30 of 30");
    expect(html).toContain("Page 2 of 2");
  });

  it("makes only columns with a sort key sortable, and marks the active sort", () => {
    const html = render({ sort: { key: "deliveries", desc: true } });
    expect(html).toMatch(/aria-sort="descending"[^>]*>[\s\S]*?Deliveries/);
    expect((html.match(/<button[^>]*type="button"[^>]*>Workspace/g) ?? []).length).toBe(1);
    expect(html).not.toMatch(/<button[^>]*>Note/);
  });

  it("shows the search box and each filter, read from the URL", () => {
    const html = render(
      {
        search: { placeholder: "Search name, slug, owner email or ID" },
        filters: [{ key: "status", label: "Subscription", options: [{ value: "trialing", label: "Trialing" }] }],
      },
      "?q=studio&status=trialing"
    );
    expect(html).toContain('placeholder="Search name, slug, owner email or ID"');
    expect(html).toContain('value="studio"');
    expect(html).toContain("Subscription: Trialing");
    expect(html).toContain("Clear");
  });

  it("says when nothing matches, and offers the first page when the page is past the end", () => {
    expect(render({ rows: [], total: 0, emptyMessage: "No workspaces match these filters." })).toContain(
      "No workspaces match these filters."
    );
    expect(render({ rows: [], total: 0 })).toContain("No results");
    expect(render({ rows: [], total: 10, page: 3 }, "?page=3")).toContain("This page is past the end");
  });
});
