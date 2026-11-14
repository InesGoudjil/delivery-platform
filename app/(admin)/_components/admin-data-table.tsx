"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "../_lib/format";
import { PAGE_SIZE_OPTIONS } from "../_lib/search-params";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** URL sort key. Set it to make the column sortable; the server does the sorting. */
    sortKey?: string;
    /** Direction of the first click on the header (default: descending). */
    sortFirst?: "asc" | "desc";
    className?: string;
  }
}

export interface AdminTableFilter {
  /** URL key, read by the page's server-side parser. */
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

const ALL = "__all";

/**
 * The admin lists' table. Rows arrive already searched, filtered, sorted and paged by the server
 * (one database call); this component only changes the URL, which re-renders the server page.
 * State lives in the URL, so a view can be reloaded, bookmarked or shared.
 */
export function AdminDataTable<TRow>({
  columns,
  rows,
  total,
  page,
  pageSize,
  getRowId,
  search,
  filters = [],
  sort,
  emptyMessage = "Nothing matches these filters.",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each column has its own value type
  columns: ColumnDef<TRow, any>[];
  rows: TRow[];
  total: number;
  page: number;
  pageSize: number;
  getRowId: (row: TRow) => string;
  search?: { placeholder: string };
  filters?: AdminTableFilter[];
  sort?: { key: string; desc: boolean };
  emptyMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const filterKeys = filters.map((filter) => filter.key).join(",");

  const parsers = useMemo(
    () => ({
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      size: parseAsStringLiteral(PAGE_SIZE_OPTIONS).withDefault("25"),
      sort: parseAsString,
      dir: parseAsStringLiteral(["asc", "desc"] as const),
      ...Object.fromEntries(filterKeys.split(",").filter(Boolean).map((key) => [key, parseAsString])),
    }),
    [filterKeys]
  );
  const [params, setParams] = useQueryStates(parsers, { shallow: false, history: "replace", startTransition });
  const values = params as Record<string, string | number | null>;

  // Search: typed locally, written to the URL after a short pause.
  const [query, setQuery] = useState(String(values.q ?? ""));
  useEffect(() => {
    setQuery(String(values.q ?? ""));
  }, [values.q]);
  useEffect(() => {
    if (query === (values.q ?? "")) return;
    const timer = setTimeout(() => setParams({ q: query.trim() || null, page: null }), 300);
    return () => clearTimeout(timer);
  }, [query, values.q, setParams]);

  const table = useReactTable({
    data: rows,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: total,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const hasFilters = Boolean(values.q) || filters.some((filter) => values[filter.key]);

  function toggleSort(sortKey: string, sortFirst: "asc" | "desc" = "desc") {
    const current = sort?.key === sortKey ? (sort.desc ? "desc" : "asc") : null;
    const next = current === null ? sortFirst : current === "desc" ? "asc" : "desc";
    setParams({ sort: sortKey, dir: next, page: null });
  }

  function clearFilters() {
    setQuery("");
    setParams({ q: null, page: null, ...Object.fromEntries(filters.map((filter) => [filter.key, null])) });
  }

  return (
    <div className="space-y-3">
      {(search || filters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                className="h-8 pl-8"
              />
            </div>
          )}
          {filters.map((filter) => {
            const items = [{ value: ALL, label: `${filter.label}: all` }, ...filter.options.map((option) => ({ value: option.value, label: `${filter.label}: ${option.label}` }))];
            return (
              <Select
                key={filter.key}
                items={items}
                value={(values[filter.key] as string | null) ?? ALL}
                onValueChange={(value) => setParams({ [filter.key]: value === ALL || !value ? null : String(value), page: null })}
              >
                <SelectTrigger size="sm" aria-label={filter.label}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      <div
        className={cn("overflow-hidden rounded-xl border border-border bg-card transition-opacity", isPending && "opacity-60")}
        aria-busy={isPending}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sortKey = meta?.sortKey;
                  const active = sortKey !== undefined && sort?.key === sortKey;
                  const label = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead
                      key={header.id}
                      className={cn("text-xs", meta?.className)}
                      aria-sort={active ? (sort?.desc ? "descending" : "ascending") : undefined}
                    >
                      {sortKey ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(sortKey, meta?.sortFirst)}
                          className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground"
                        >
                          {label}
                          {active ? (
                            sort?.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn("align-middle", cell.column.columnDef.meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  {page > 1 && total > 0 ? (
                    <Button variant="link" onClick={() => setParams({ page: null })}>
                      This page is past the end. Go to the first page
                    </Button>
                  ) : (
                    emptyMessage
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="tabular-nums">
          {total === 0 ? "No results" : `${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)}`}
        </p>
        <div className="flex items-center gap-2">
          <Select
            items={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} per page` }))}
            value={String(pageSize)}
            onValueChange={(value) => setParams({ size: (value as (typeof PAGE_SIZE_OPTIONS)[number]) ?? null, page: null })}
          >
            <SelectTrigger size="sm" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {size} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setParams({ page: page - 1 > 1 ? page - 1 : null })}
            disabled={page <= 1 || isPending}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular-nums">
            Page {formatNumber(page)} of {formatNumber(pageCount)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setParams({ page: page + 1 })}
            disabled={page >= pageCount || isPending}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
