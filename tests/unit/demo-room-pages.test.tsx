import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
  usePathname: () => "/demo",
  useSearchParams: () => new URLSearchParams(),
}));

import { DeliveryRoomClient } from "@/app/(public)/deliver/[shareToken]/delivery-room-client";
import { DemoRoomBanner } from "@/app/(public)/deliver/[shareToken]/_components/demo-room-banner";
import type { DeliveryRoomProps } from "@/app/(public)/deliver/[shareToken]/_components/types";
import { DemoRoomCard, demoRoomNotes, type DemoRoomCardData, type DemoRoomDelivery } from "@/app/(admin)/admin/site/demo-room-card";
import { HeroSection } from "@/components/landing/HeroSection";
import { HeaderSection } from "@/components/landing/HeaderSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { I18nProvider } from "@/i18n";

/**
 * The demo room as people see it: the strip at the top of the room, the admin card that sets it
 * up, and the landing page links, which only show while the demo room is on.
 */

const roomProps = (demoMode: DeliveryRoomProps["demoMode"]): DeliveryRoomProps => ({
  delivery: {
    id: "30000000-0000-4000-8000-0000000000d1",
    workspaceId: "10000000-0000-4000-8000-0000000000d1",
    title: "Aisha & Omar",
    shareToken: "share_token_demo_room_01",
    status: "in_review",
    isDownloadAllowed: false,
    isCommentAllowed: true,
    isWatermarked: false,
  },
  workspace: { brandName: "Pedro Films", slug: "pedro-films" },
  initialAssets: [],
  isPasscodeProtected: false,
  isInitiallyUnlocked: true,
  demoMode,
});

describe("the demo room page", () => {
  it("tells visitors it's a demo and that nothing they do is saved", () => {
    const html = renderToStaticMarkup(<DeliveryRoomClient {...roomProps("visitor")} />);
    expect(html).toContain("Demo room.");
    expect(html).toContain("nothing you do here is saved");
    expect(html).toContain('href="/signup"');
  });

  it("tells members of the demo's workspace that what they do there is public", () => {
    const html = renderToStaticMarkup(<DemoRoomBanner mode="member" />);
    expect(html).toContain("your comments and approvals are saved");
    expect(html).not.toContain('href="/signup"');
  });

  it("shows no demo strip in an ordinary room", () => {
    const html = renderToStaticMarkup(<DeliveryRoomClient {...roomProps(null)} />);
    expect(html).not.toContain("Demo room.");
    expect(html).not.toContain("demo room");
  });
});

const openDelivery: DemoRoomDelivery = {
  title: "Aisha & Omar",
  workspaceId: "10000000-0000-4000-8000-0000000000d1",
  workspaceName: "Pedro Films",
  studioPath: "/pedro-films/deliveries/30000000-0000-4000-8000-0000000000d1",
  state: "open",
  workspaceSuspended: false,
  expiresAt: null,
  commentsOn: true,
};

const card = (data: Partial<DemoRoomCardData>) =>
  renderToStaticMarkup(
    <DemoRoomCard demo={{ showOnLanding: false, updatedAt: null, deliveryMissing: false, delivery: null, ...data }} />
  );

describe("the admin's demo room card", () => {
  it("explains how to set one up while there's none", () => {
    const html = card({});
    expect(html).toContain("No demo room yet.");
    expect(html).toContain("Choose the demo delivery…");
    expect(html).toContain("Not set");
    expect(html).not.toContain("Remove the demo room");
  });

  it("shows the chosen delivery, a preview link, and whether the landing page links to it", () => {
    const html = card({ showOnLanding: true, updatedAt: "2026-11-15T12:00:00Z", delivery: openDelivery });
    expect(html).toContain("Aisha &amp; Omar");
    expect(html).toContain('href="/demo"');
    expect(html).toContain('href="/pedro-films/deliveries/30000000-0000-4000-8000-0000000000d1"');
    expect(html).toContain("On the landing page");
    expect(html).toContain("Hide from the landing page");
    expect(html).toContain('href="/admin/audit?action=site.update_demo_room"');
  });

  it("warns when visitors can't open the room, and keeps it off the landing page", () => {
    const html = card({ showOnLanding: true, delivery: { ...openDelivery, state: "locked" } });
    expect(html).toContain("Hidden: visitors can&#x27;t open it");
    expect(html).toContain("It has a passcode");
  });

  it("says when the saved delivery no longer exists", () => {
    const html = card({ deliveryMissing: true });
    expect(html).toContain("no longer exists");
    expect(html).toContain("Remove the demo room");
  });

  it("lists what the admin should know about the delivery, problems first", () => {
    expect(demoRoomNotes({ ...openDelivery, state: "expired", expiresAt: "2026-11-01T00:00:00Z" })[0]).toMatchObject({
      tone: "warning",
    });
    expect(demoRoomNotes({ ...openDelivery, workspaceSuspended: true, state: "unavailable" })[0].text).toContain("suspended");
    const notes = demoRoomNotes({ ...openDelivery, commentsOn: false, expiresAt: "2099-01-01T00:00:00Z" });
    expect(notes.map((note) => note.tone)).toEqual(["info", "info", "info"]);
    expect(notes[1].text).toContain("Comments are off");
  });
});

const header = (demoHref?: string) =>
  renderToStaticMarkup(
    <I18nProvider>
      <HeaderSection demoHref={demoHref} />
    </I18nProvider>
  );

describe("the landing page", () => {
  it("links to the demo room from the hero, the menu and the client experience block while it's on", () => {
    expect(renderToStaticMarkup(<HeroSection startHref="/signup" demoHref="/demo" />)).toContain("SEE A DEMO DELIVERY");
    expect(header("/demo")).toContain('href="/demo"');
    expect(renderToStaticMarkup(<FeaturesSection demoHref="/demo" />)).toContain("Open the demo room");
  });

  it("has no demo links while it's off", () => {
    for (const html of [
      renderToStaticMarkup(<HeroSection startHref="/signup" />),
      header(),
      renderToStaticMarkup(<FeaturesSection />),
    ]) {
      expect(html).not.toContain('href="/demo"');
      expect(html).not.toContain("SEE A DEMO DELIVERY");
    }
  });
});
