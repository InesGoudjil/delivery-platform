import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { DeliveryProjectItem } from "@/lib/deliveries/list-view";

const nav = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
  usePathname: () => "/studio-a/deliveries",
  useSearchParams: () => nav.params,
}));
vi.mock("@/components/modals", () => ({ useModals: () => ({ setShowNewDeliveryModal: () => {} }) }));
vi.mock("@/app/actions/deliveries", () => ({ deleteDeliveryAction: async () => ({ success: true }) }));

import { DeliveriesClient } from "@/app/(workspace)/[workspaceSlug]/deliveries/deliveries-client";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function room(overrides: Partial<DeliveryProjectItem> & { id: string; title: string }): DeliveryProjectItem {
  return {
    description: null,
    clientId: null,
    clientName: "Private Client",
    version: "v1_Master",
    duration: "01:00",
    status: "in_review",
    shareToken: `token-${overrides.id}`,
    passcodeProtected: false,
    downloadsAllowed: false,
    assetsCount: 3,
    commentsCount: 0,
    openNotesCount: 0,
    createdAt: hoursAgo(100),
    lastActivityAt: hoursAgo(100),
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
    commentsCount: 5,
    lastNoteAt: hoursAgo(2),
    lastActivityAt: hoursAgo(2),
  }),
  room({ id: "ramadan", title: "Ramadan campaign cut", clientId: "c-atlas", clientName: "Atlas Motors", lastActivityAt: hoursAgo(5) }),
  room({
    id: "showroom",
    title: "Showroom walkthrough",
    clientId: "c-atlas",
    clientName: "Atlas Motors",
    lastOpenedAt: hoursAgo(9),
    lastActivityAt: hoursAgo(9),
  }),
  room({ id: "empty", title: "Empty room", assetsCount: 0, lastActivityAt: hoursAgo(20) }),
  room({ id: "hotel", title: "Hotel brand film", status: "archived", lastActivityAt: hoursAgo(900) }),
];

function render(query: string, deliveries: DeliveryProjectItem[] = ROOMS) {
  nav.params = new URLSearchParams(query);
  return renderToStaticMarkup(
    React.createElement(DeliveriesClient, {
      workspace: { id: "w1", brandName: "Studio A", slug: "studio-a" },
      deliveries,
      renderedAt: NOW,
    })
  );
}

/** The tab button's markup, from its label. */
function tabButton(html: string, label: string): string {
  const match = html.match(new RegExp(`<button[^>]*aria-pressed="(true|false)"[^>]*>(?:(?!</button>).)*?${label}(?:(?!</button>).)*?</button>`));
  if (!match) throw new Error(`No tab "${label}"`);
  return match[0];
}

const order = (html: string, titles: string[]) => titles.map((title) => html.indexOf(title));

describe("DeliveriesClient: the list", () => {
  it("shows every room but archived ones, latest activity first", () => {
    const html = render("");
    const positions = order(html, ["Spring menu launch", "Ramadan campaign cut", "Showroom walkthrough", "Empty room"]);
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).not.toContain("Hotel brand film");
    expect(tabButton(html, "All")).toContain('aria-pressed="true"');
  });

  it("counts each tab", () => {
    const html = render("");
    expect(tabButton(html, "All")).toMatch(/>4<\/span>/);
    expect(tabButton(html, "Needs reply")).toMatch(/>1<\/span>/);
    expect(tabButton(html, "In review")).toMatch(/>4<\/span>/);
    expect(tabButton(html, "Approved")).toMatch(/>0<\/span>/);
    expect(tabButton(html, "Archived")).toMatch(/>1<\/span>/);
  });

  it("puts open notes, the last visit and empty rooms on the cards", () => {
    const html = render("");
    expect(html).toContain("4 open notes");
    expect(html).toContain("Last note 2 h ago");
    expect(html).toContain("Client opened 9 h ago");
    expect(html).toContain("Not opened yet");
    expect(html).toContain("No files yet");
  });

  it("makes client names a filter, but not a missing client", () => {
    const html = render("");
    expect(html).toContain('title="Show only rooms for Sahara Coffee"');
    expect(html).toContain("<strong class=\"text-foreground\">Private Client</strong>");
  });
});

describe("DeliveriesClient: tabs, search and client filter from the URL", () => {
  it("shows only rooms with open client notes under Needs reply", () => {
    const html = render("status=needs_reply");
    expect(tabButton(html, "Needs reply")).toContain('aria-pressed="true"');
    expect(html).toContain("Spring menu launch");
    expect(html).not.toContain("Ramadan campaign cut");
  });

  it("searches and says how many rooms are left", () => {
    const html = render("search=atlas");
    expect(html).toContain("Showing 2 of 4 rooms");
    expect(html).toContain("“atlas”");
    expect(html).toContain('value="atlas"');
    expect(html).toContain("Ramadan campaign cut");
    expect(html).not.toContain("Spring menu launch");
  });

  it("narrows to one client and shows it", () => {
    const html = render("client=c-atlas");
    expect(html).toMatch(/Client: <strong class="font-semibold">Atlas Motors<\/strong>/);
    expect(html).toContain("Showing 2 of 4 rooms");
    expect(html).toContain('title="Show every client"');
    expect(html).not.toContain("Spring menu launch");
  });

  it("ignores a client with no rooms here", () => {
    const html = render("client=someone-else");
    expect(html).not.toContain("Showing");
    expect(html).toContain("Spring menu launch");
  });

  it("archived rooms have their own tab", () => {
    const html = render("status=archived");
    expect(html).toContain("Hotel brand film");
    expect(html).not.toContain("Spring menu launch");
  });
});

describe("DeliveriesClient: empty states", () => {
  it("offers to clear the filters when nothing matches", () => {
    const html = render("search=nothing-like-this");
    expect(html).toContain("No rooms match");
    expect(html).toContain("Clear filters");
    expect(html).not.toContain("Get started by creating");
  });

  it("says what an empty tab is for", () => {
    expect(render("status=approved")).toContain("No approved rooms yet");
    const allDone = ROOMS.map((item) => ({ ...item, openNotesCount: 0 }));
    expect(render("status=needs_reply", allDone)).toContain("Nothing waiting on you");
  });

  it("invites a first room when there are none", () => {
    expect(render("", [])).toContain("Get started by creating your first client delivery room");
  });
});

describe("DeliveriesClient: sort", () => {
  it("shows the sort in use and orders by it", () => {
    const html = render("sort=name");
    expect(html).toContain("Name A–Z");
    const positions = order(html, ["Empty room", "Ramadan campaign cut", "Showroom walkthrough", "Spring menu launch"]);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("shows the default sort's name", () => {
    expect(render("")).toContain("Latest activity");
  });
});
