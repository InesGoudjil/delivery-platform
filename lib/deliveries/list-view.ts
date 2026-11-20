/**
 * The studio's deliveries list (/[workspace]/deliveries): which rooms a status tab, a search
 * and a client filter show, in what order, and the line of activity on each card.
 *
 * Pure functions, so the server render and the browser agree, and tests can pin the rules.
 */
import type { DeliveryStatus } from "@/core/entities/delivery";
import { timeAgo } from "@/lib/share-links/format";

/** One room as the list shows it. */
export interface DeliveryProjectItem {
  id: string;
  title: string;
  description: string | null;
  clientId: string | null;
  clientName: string;
  version: string;
  duration: string;
  status: DeliveryStatus;
  shareToken: string;
  passcodeProtected: boolean;
  downloadsAllowed: boolean;
  assetsCount?: number;
  /** Every note on the room's files. */
  commentsCount: number;
  /** Unresolved notes written by the client. */
  openNotesCount: number;
  createdAt: string;
  /** The latest note, reply, client visit or download, new file, approval or room edit. */
  lastActivityAt: string;
  lastNoteAt: string | null;
  /** Last client visit and download. null: never. undefined: unknown, so say nothing. */
  lastOpenedAt?: string | null;
  lastDownloadedAt?: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

export type DeliveryTab = "all" | "needs_reply" | "in_review" | "approved" | "archived";

export const DELIVERY_TABS: ReadonlyArray<{ id: DeliveryTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "needs_reply", label: "Needs reply" },
  { id: "in_review", label: "In review" },
  { id: "approved", label: "Approved" },
  { id: "archived", label: "Archived" },
];

/** The tab in the URL (?status=…). Anything else is "all". */
export function parseDeliveryTab(value: string | null | undefined): DeliveryTab {
  return DELIVERY_TABS.find((tab) => tab.id === value)?.id ?? "all";
}

/** "All" leaves archived rooms out; they have their own tab. Drafts count as in review. */
export function inTab(item: DeliveryProjectItem, tab: DeliveryTab): boolean {
  switch (tab) {
    case "all":
      return item.status !== "archived";
    case "needs_reply":
      return item.status !== "archived" && item.openNotesCount > 0;
    case "in_review":
      return item.status === "in_review" || item.status === "draft";
    case "approved":
      return item.status === "approved";
    case "archived":
      return item.status === "archived";
  }
}

/* -------------------------------------------------------------------------- */
/* Sort                                                                       */
/* -------------------------------------------------------------------------- */

export type DeliverySort = "activity" | "newest" | "oldest" | "name" | "notes";

export const DEFAULT_DELIVERY_SORT: DeliverySort = "activity";

export const DELIVERY_SORTS: ReadonlyArray<{ id: DeliverySort; label: string }> = [
  { id: "activity", label: "Latest activity" },
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "name", label: "Name A–Z" },
  { id: "notes", label: "Most open notes" },
];

/** The sort in the URL (?sort=…). Anything else is the default, latest activity. */
export function parseDeliverySort(value: string | null | undefined): DeliverySort {
  return DELIVERY_SORTS.find((sort) => sort.id === value)?.id ?? DEFAULT_DELIVERY_SORT;
}

function timeOf(iso: string | null | undefined): number {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(time) ? time : 0;
}

const byActivity = (a: DeliveryProjectItem, b: DeliveryProjectItem) =>
  timeOf(b.lastActivityAt) - timeOf(a.lastActivityAt) || timeOf(b.createdAt) - timeOf(a.createdAt);

const COMPARE: Record<DeliverySort, (a: DeliveryProjectItem, b: DeliveryProjectItem) => number> = {
  activity: byActivity,
  newest: (a, b) => timeOf(b.createdAt) - timeOf(a.createdAt),
  oldest: (a, b) => timeOf(a.createdAt) - timeOf(b.createdAt),
  // A fixed locale, so the server and the browser order names the same way.
  name: (a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true }) || byActivity(a, b),
  notes: (a, b) => b.openNotesCount - a.openNotesCount || byActivity(a, b),
};

/* -------------------------------------------------------------------------- */
/* Search and the whole query                                                 */
/* -------------------------------------------------------------------------- */

/** Latin accents, and the Arabic short vowels and dagger alif. */
const COMBINING_MARKS = /[̀-ًͯ-ٰٟ]/g;

/** Lowercase, without accents: "Café Noël" matches "cafe noel". */
export function foldForSearch(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

/** Every word of the search is somewhere in the title, the client's name or the description. */
export function matchesSearch(item: DeliveryProjectItem, search: string): boolean {
  const words = foldForSearch(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = foldForSearch(`${item.title} ${item.clientName} ${item.description ?? ""}`);
  return words.every((word) => text.includes(word));
}

export interface DeliveryListQuery {
  tab: DeliveryTab;
  search: string;
  sort: DeliverySort;
  /** Only this client's rooms. */
  clientId: string | null;
}

function refined(item: DeliveryProjectItem, query: Pick<DeliveryListQuery, "search" | "clientId">): boolean {
  return (!query.clientId || item.clientId === query.clientId) && matchesSearch(item, query.search);
}

/** The rooms the list shows, in order. */
export function selectDeliveries(items: DeliveryProjectItem[], query: DeliveryListQuery): DeliveryProjectItem[] {
  return items.filter((item) => inTab(item, query.tab) && refined(item, query)).sort(COMPARE[query.sort]);
}

/** How many rooms each tab would show with the current search and client filter. */
export function countByTab(
  items: DeliveryProjectItem[],
  query: Pick<DeliveryListQuery, "search" | "clientId">
): Record<DeliveryTab, number> {
  const counts: Record<DeliveryTab, number> = { all: 0, needs_reply: 0, in_review: 0, approved: 0, archived: 0 };
  for (const item of items) {
    if (!refined(item, query)) continue;
    for (const { id } of DELIVERY_TABS) {
      if (inTab(item, id)) counts[id] += 1;
    }
  }
  return counts;
}

/* -------------------------------------------------------------------------- */
/* Activity line                                                              */
/* -------------------------------------------------------------------------- */

const DAY = 24 * 60 * 60 * 1000;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

/**
 * "just now", "5 min ago", "3 h ago", "2 days ago", then weeks, months and years. Never a
 * date, so the server and the browser say the same thing whatever their time zones.
 */
export function relativeTime(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const days = Math.floor(Math.max(0, now - time) / DAY);
  if (days < 7) return timeAgo(iso, now);
  if (days < 30) return plural(Math.floor(days / 7), "week");
  if (days < 365) return plural(Math.floor(days / 30), "month");
  return plural(Math.floor(days / 365), "year");
}

export type DeliveryActivityKind =
  | "archived"
  | "notes"
  | "approved"
  | "downloaded"
  | "opened"
  | "empty"
  | "unopened"
  | "created";

/** The one thing worth knowing about a room at a glance, most urgent first. */
export function describeActivity(item: DeliveryProjectItem, now: number): { kind: DeliveryActivityKind; label: string } {
  if (item.status === "archived") return { kind: "archived", label: "Archived" };

  if (item.openNotesCount > 0) {
    return item.lastNoteAt
      ? { kind: "notes", label: `Last note ${relativeTime(item.lastNoteAt, now)}` }
      : { kind: "notes", label: `${item.openNotesCount} open notes` };
  }

  if (item.status === "approved") {
    const who = item.approvedByName?.trim() || "";
    if (!item.approvedAt) return { kind: "approved", label: who ? `Approved by ${who}` : "Approved" };
    const when = relativeTime(item.approvedAt, now);
    return { kind: "approved", label: who ? `${who} approved ${when}` : `Approved ${when}` };
  }

  const opened = item.lastOpenedAt;
  const downloaded = item.lastDownloadedAt;
  if (downloaded && (!opened || timeOf(downloaded) >= timeOf(opened))) {
    return { kind: "downloaded", label: `Client downloaded ${relativeTime(downloaded, now)}` };
  }
  if (opened) return { kind: "opened", label: `Client opened ${relativeTime(opened, now)}` };
  if ((item.assetsCount ?? 0) === 0) return { kind: "empty", label: "No files yet" };
  if (opened === null) return { kind: "unopened", label: "Not opened yet" };
  return { kind: "created", label: `Created ${relativeTime(item.createdAt, now)}` };
}
