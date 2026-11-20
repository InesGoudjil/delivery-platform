"use client";

import React, { useEffect, useRef } from "react";
import { ArrowUpDown, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DELIVERY_SORTS,
  DELIVERY_TABS,
  parseDeliverySort,
  type DeliverySort,
  type DeliveryTab,
} from "@/lib/deliveries/list-view";

const SORT_ITEMS = DELIVERY_SORTS.map((sort) => ({ value: sort.id, label: sort.label }));

interface DeliveryFilterBarProps {
  tab: DeliveryTab;
  /** Rooms per tab, with the search and client filter applied. */
  counts: Record<DeliveryTab, number>;
  onTabChange: (tab: DeliveryTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sort: DeliverySort;
  onSortChange: (sort: DeliverySort) => void;
  /** Rooms shown, and rooms in the tab before the search and client filter. */
  shownCount: number;
  tabCount: number;
  client: { id: string; name: string } | null;
  onClearClient: () => void;
  onClearAll: () => void;
}

/** Status tabs, search and sort over the deliveries list, plus what's narrowing it. */
export function DeliveryFilterBar({
  tab,
  counts,
  onTabChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  shownCount,
  tabCount,
  client,
  onClearClient,
  onClearAll,
}: DeliveryFilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchText = search.trim();
  const refining = Boolean(searchText || client);

  // "/" jumps to the search, unless the user is typing somewhere or a dialog is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest("input, textarea, select, [role='dialog']")) return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="space-y-3">
      {/* Search and sort sit beside the tabs when the page is wide enough (the sidebar takes its
          share, so no breakpoint fits), and wrap under them, left-aligned, when it isn't. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Wraps on narrow screens; the fixed radius keeps a wrapped bar a rounded box, not a capsule. */}
        <div
          role="group"
          aria-label="Filter deliveries by status"
          className="glass-pill max-w-full rounded-[1.25rem] p-1 flex flex-wrap items-center gap-1"
        >
          {DELIVERY_TABS.map(({ id, label }) => {
            const active = tab === id;
            const count = counts[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onTabChange(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {id === "needs_reply" && count > 0 && !active && (
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                )}
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] leading-4 tabular-nums",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex grow basis-72 max-w-full sm:max-w-md items-center gap-2">
          <div className="glass-pill relative flex items-center rounded-full h-9 flex-1 min-w-0">
            <Search aria-hidden="true" className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                if (search) {
                  event.preventDefault();
                  onSearchChange("");
                } else {
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search title or client"
              aria-label="Search deliveries"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="h-full w-full min-w-0 rounded-full bg-transparent pl-8 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-1.5 inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-3 hidden sm:inline-flex h-5 items-center rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground"
              >
                /
              </kbd>
            )}
          </div>

          <Select
            items={SORT_ITEMS}
            value={sort}
            onValueChange={(value) => {
              if (value) onSortChange(parseDeliverySort(String(value)));
            }}
          >
            <SelectTrigger
              aria-label="Sort deliveries"
              className="glass-pill w-[9.75rem] shrink-0 rounded-full data-[size=default]:h-9 pl-3 pr-2.5 text-xs font-semibold text-foreground cursor-pointer"
            >
              <ArrowUpDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {DELIVERY_SORTS.map((option) => (
                <SelectItem key={option.id} value={option.id} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {refining && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing {shownCount} of {tabCount} {tabCount === 1 ? "room" : "rooms"}
          </span>
          {client && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-1 text-foreground">
              Client: <strong className="font-semibold">{client.name}</strong>
              <button
                type="button"
                onClick={onClearClient}
                aria-label={`Stop showing only ${client.name}`}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          {searchText && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-1 text-foreground">
              <span className="truncate">“{searchText}”</span>
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <button type="button" onClick={onClearAll} className="font-semibold text-primary hover:underline cursor-pointer">
            Clear all
          </button>
        </div>
      )}

      {/* Read out how many rooms are left while a search or client filter narrows the list. */}
      <p className="sr-only" role="status">
        {refining ? `${shownCount} ${shownCount === 1 ? "room" : "rooms"} shown` : ""}
      </p>
    </div>
  );
}
