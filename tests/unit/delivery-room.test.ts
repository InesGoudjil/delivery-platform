import { describe, it, expect } from "vitest";
import { DeliveryRoomClient } from "@/app/(public)/deliver/[shareToken]/delivery-room-client";
import { DeliveryPasscodeDialog } from "@/app/(public)/deliver/[shareToken]/_components/delivery-passcode-dialog";
import { DeliveryRoomHeader } from "@/app/(public)/deliver/[shareToken]/_components/delivery-room-header";
import { DeliveryHeroBanner } from "@/app/(public)/deliver/[shareToken]/_components/delivery-hero-banner";
import { DeliveryActionBar } from "@/app/(public)/deliver/[shareToken]/_components/delivery-action-bar";
import { DeliveryAssetCard } from "@/app/(public)/deliver/[shareToken]/_components/delivery-asset-card";
import { DeliveryAssetGrid } from "@/app/(public)/deliver/[shareToken]/_components/delivery-asset-grid";
import { DeliveryRoomFooter } from "@/app/(public)/deliver/[shareToken]/_components/delivery-room-footer";
import { useDeliveryRoom } from "@/app/(public)/deliver/[shareToken]/_components/use-delivery-room";

describe("DeliveryRoom Component Decomposition", () => {
  it("exports DeliveryRoomClient as the main orchestrator component", () => {
    expect(typeof DeliveryRoomClient).toBe("function");
  });

  it("exports useDeliveryRoom hook for state and business logic encapsulation", () => {
    expect(typeof useDeliveryRoom).toBe("function");
  });

  it("exports modular subcomponents with clean boundaries", () => {
    expect(typeof DeliveryPasscodeDialog).toBe("function");
    expect(typeof DeliveryRoomHeader).toBe("function");
    expect(typeof DeliveryHeroBanner).toBe("function");
    expect(typeof DeliveryActionBar).toBe("function");
    expect(typeof DeliveryAssetCard).toBe("function");
    expect(typeof DeliveryAssetGrid).toBe("function");
    expect(typeof DeliveryRoomFooter).toBe("function");
  });
});
