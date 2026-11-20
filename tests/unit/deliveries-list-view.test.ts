import { describe, it, expect } from "vitest";
import {
  countByTab,
  describeActivity,
  foldForSearch,
  inTab,
  matchesSearch,
  parseDeliverySort,
  parseDeliveryTab,
  relativeTime,
  selectDeliveries,
  type DeliveryListQuery,
  type DeliveryProjectItem,
} from "@/lib/deliveries/list-view";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

function room(overrides: Partial<DeliveryProjectItem> & { id: string }): DeliveryProjectItem {
  return {
    title: `Room ${overrides.id}`,
    description: null,
    clientId: null,
    clientName: "Private Client",
    version: "v1_Master",
    duration: "01:00",
    status: "in_review",
    shareToken: `token-${overrides.id}`,
    passcodeProtected: false,
    downloadsAllowed: false,
    assetsCount: 1,
    commentsCount: 0,
    openNotesCount: 0,
    createdAt: daysAgo(10),
    lastActivityAt: daysAgo(10),
    lastNoteAt: null,
    lastOpenedAt: null,
    lastDownloadedAt: null,
    approvedAt: null,
    approvedByName: null,
    ...overrides,
  };
}

const ROOMS: DeliveryProjectItem[] = [
  room({
    id: "spring",
    title: "Spring menu launch",
    clientId: "c-sahara",
    clientName: "Sahara Coffee",
    openNotesCount: 4,
    commentsCount: 6,
    lastNoteAt: hoursAgo(2),
    lastActivityAt: hoursAgo(2),
    createdAt: daysAgo(3),
  }),
  room({
    id: "ramadan",
    title: "Ramadan campaign cut",
    clientId: "c-atlas",
    clientName: "Atlas Motors",
    lastActivityAt: hoursAgo(5),
    createdAt: hoursAgo(5),
  }),
  room({
    id: "showroom",
    title: "Showroom walkthrough",
    clientId: "c-atlas",
    clientName: "Atlas Motors",
    description: "Café scene, second floor",
    openNotesCount: 2,
    lastNoteAt: hoursAgo(9),
    lastActivityAt: hoursAgo(9),
    createdAt: daysAgo(6),
  }),
  room({
    id: "wedding",
    title: "Wedding highlights",
    status: "approved",
    approvedAt: hoursAgo(26),
    approvedByName: "Nour",
    lastActivityAt: hoursAgo(26),
    createdAt: daysAgo(12),
  }),
  room({ id: "teaser", title: "album teaser", status: "draft", lastActivityAt: hoursAgo(30), createdAt: daysAgo(1) }),
  room({
    id: "hotel",
    title: "Hotel brand film",
    status: "archived",
    openNotesCount: 1,
    lastActivityAt: daysAgo(90),
    createdAt: daysAgo(120),
  }),
];

const query = (overrides: Partial<DeliveryListQuery> = {}): DeliveryListQuery => ({
  tab: "all",
  search: "",
  sort: "activity",
  clientId: null,
  ...overrides,
});

const ids = (items: DeliveryProjectItem[]) => items.map((item) => item.id);

describe("deliveries list: URL values", () => {
  it("reads known tabs and sorts, and falls back for anything else", () => {
    expect(parseDeliveryTab("needs_reply")).toBe("needs_reply");
    expect(parseDeliveryTab("approved")).toBe("approved");
    expect(parseDeliveryTab("deleted")).toBe("all");
    expect(parseDeliveryTab(null)).toBe("all");
    expect(parseDeliverySort("name")).toBe("name");
    expect(parseDeliverySort("random")).toBe("activity");
    expect(parseDeliverySort(undefined)).toBe("activity");
  });
});

describe("deliveries list: tabs", () => {
  it("leaves archived rooms out of All and out of Needs reply", () => {
    const hotel = ROOMS.find((item) => item.id === "hotel")!;
    expect(inTab(hotel, "all")).toBe(false);
    expect(inTab(hotel, "needs_reply")).toBe(false);
    expect(inTab(hotel, "archived")).toBe(true);
  });

  it("counts drafts as in review", () => {
    expect(ids(selectDeliveries(ROOMS, query({ tab: "in_review" })))).toEqual(["spring", "ramadan", "showroom", "teaser"]);
  });

  it("shows rooms with open client notes under Needs reply", () => {
    expect(ids(selectDeliveries(ROOMS, query({ tab: "needs_reply" })))).toEqual(["spring", "showroom"]);
  });

  it("counts each tab with the search and client filter applied", () => {
    expect(countByTab(ROOMS, { search: "", clientId: null })).toEqual({
      all: 5,
      needs_reply: 2,
      in_review: 4,
      approved: 1,
      archived: 1,
    });
    expect(countByTab(ROOMS, { search: "", clientId: "c-atlas" })).toEqual({
      all: 2,
      needs_reply: 1,
      in_review: 2,
      approved: 0,
      archived: 0,
    });
  });
});

describe("deliveries list: search", () => {
  it("ignores case and accents", () => {
    expect(foldForSearch("Café NOËL")).toBe("cafe noel");
    const showroom = ROOMS.find((item) => item.id === "showroom")!;
    expect(matchesSearch(showroom, "cafe")).toBe(true);
    expect(matchesSearch(showroom, "CAFÉ")).toBe(true);
  });

  it("needs every word, from the title, client or description", () => {
    expect(ids(selectDeliveries(ROOMS, query({ search: "atlas ramadan" })))).toEqual(["ramadan"]);
    expect(ids(selectDeliveries(ROOMS, query({ search: "atlas" })))).toEqual(["ramadan", "showroom"]);
    expect(ids(selectDeliveries(ROOMS, query({ search: "atlas wedding" })))).toEqual([]);
  });

  it("treats a blank search as no search", () => {
    expect(selectDeliveries(ROOMS, query({ search: "   " }))).toHaveLength(5);
  });

  it("narrows to one client", () => {
    expect(ids(selectDeliveries(ROOMS, query({ clientId: "c-sahara" })))).toEqual(["spring"]);
  });
});

describe("deliveries list: sort", () => {
  it("puts the latest activity first by default", () => {
    expect(ids(selectDeliveries(ROOMS, query()))).toEqual(["spring", "ramadan", "showroom", "wedding", "teaser"]);
  });

  it("sorts by creation date both ways", () => {
    expect(ids(selectDeliveries(ROOMS, query({ sort: "newest" })))).toEqual(["ramadan", "teaser", "spring", "showroom", "wedding"]);
    expect(ids(selectDeliveries(ROOMS, query({ sort: "oldest" })))).toEqual(["wedding", "showroom", "spring", "teaser", "ramadan"]);
  });

  it("sorts names without regard to case", () => {
    expect(ids(selectDeliveries(ROOMS, query({ sort: "name" })))).toEqual(["teaser", "ramadan", "showroom", "spring", "wedding"]);
  });

  it("puts the most open notes first, then the latest activity", () => {
    expect(ids(selectDeliveries(ROOMS, query({ sort: "notes" })))).toEqual(["spring", "showroom", "ramadan", "wedding", "teaser"]);
  });

  it("doesn't reorder the rooms it was given", () => {
    const copy = [...ROOMS];
    selectDeliveries(copy, query({ sort: "name" }));
    expect(ids(copy)).toEqual(ids(ROOMS));
  });
});

describe("deliveries list: relative time", () => {
  it("uses the share links' wording for the first week", () => {
    expect(relativeTime(new Date(NOW - 20_000).toISOString(), NOW)).toBe("just now");
    expect(relativeTime(hoursAgo(0.5), NOW)).toBe("30 min ago");
    expect(relativeTime(hoursAgo(5), NOW)).toBe("5 h ago");
    expect(relativeTime(daysAgo(1), NOW)).toBe("1 day ago");
    expect(relativeTime(daysAgo(6), NOW)).toBe("6 days ago");
  });

  it("then counts weeks, months and years instead of printing a date", () => {
    expect(relativeTime(daysAgo(7), NOW)).toBe("1 week ago");
    expect(relativeTime(daysAgo(20), NOW)).toBe("2 weeks ago");
    expect(relativeTime(daysAgo(45), NOW)).toBe("1 month ago");
    expect(relativeTime(daysAgo(200), NOW)).toBe("6 months ago");
    expect(relativeTime(daysAgo(800), NOW)).toBe("2 years ago");
  });

  it("never goes negative for a time in the future", () => {
    expect(relativeTime(hoursAgo(-3), NOW)).toBe("just now");
  });
});

describe("deliveries list: activity line", () => {
  it("leads with open notes, even on an approved room", () => {
    expect(describeActivity(room({ id: "a", openNotesCount: 2, lastNoteAt: hoursAgo(3) }), NOW)).toEqual({
      kind: "notes",
      label: "Last note 3 h ago",
    });
    expect(
      describeActivity(room({ id: "b", status: "approved", openNotesCount: 1, lastNoteAt: hoursAgo(1) }), NOW).kind
    ).toBe("notes");
  });

  it("says who approved, and when", () => {
    const approved = room({ id: "a", status: "approved", approvedAt: daysAgo(2), approvedByName: "Nour" });
    expect(describeActivity(approved, NOW).label).toBe("Nour approved 2 days ago");
    expect(describeActivity({ ...approved, approvedByName: null }, NOW).label).toBe("Approved 2 days ago");
    expect(describeActivity({ ...approved, approvedAt: null }, NOW).label).toBe("Approved by Nour");
  });

  it("shows the client's latest visit or download", () => {
    expect(describeActivity(room({ id: "a", lastOpenedAt: hoursAgo(2) }), NOW).label).toBe("Client opened 2 h ago");
    expect(
      describeActivity(room({ id: "b", lastOpenedAt: hoursAgo(5), lastDownloadedAt: hoursAgo(4) }), NOW).label
    ).toBe("Client downloaded 4 h ago");
    expect(
      describeActivity(room({ id: "c", lastOpenedAt: hoursAgo(1), lastDownloadedAt: daysAgo(2) }), NOW).label
    ).toBe("Client opened 1 h ago");
  });

  it("says a room was never opened only when that's known", () => {
    expect(describeActivity(room({ id: "a", lastOpenedAt: null }), NOW)).toEqual({
      kind: "unopened",
      label: "Not opened yet",
    });
    expect(describeActivity(room({ id: "b", lastOpenedAt: undefined, createdAt: daysAgo(3) }), NOW)).toEqual({
      kind: "created",
      label: "Created 3 days ago",
    });
  });

  it("points out an empty room and an archived one", () => {
    expect(describeActivity(room({ id: "a", assetsCount: 0 }), NOW).label).toBe("No files yet");
    expect(describeActivity(room({ id: "b", status: "archived", openNotesCount: 3 }), NOW).label).toBe("Archived");
  });
});
