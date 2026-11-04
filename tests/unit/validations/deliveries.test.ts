import { describe, it, expect } from "vitest";
import {
  createDeliverySchema,
  verifyDeliveryPasscodeSchema,
  updateDeliveryDetailsSchema,
  loadMoreDeliveryAssetsSchema,
} from "@/lib/validations/deliveries";

describe("lib/validations/deliveries", () => {
  describe("createDeliverySchema", () => {
    it("validates a standard delivery creation payload", () => {
      const valid = {
        workspaceId: "ws_12345",
        title: "Nike Commercial Final Cut",
        description: "Review version 3 with color grade",
        clientNameOrId: "Nike Studio",
        clientEmail: "producer@nike.com",
      };

      const result = createDeliverySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Nike Commercial Final Cut");
        expect(result.data.clientEmail).toBe("producer@nike.com");
      }
    });

    it("rejects when workspaceId is missing or empty", () => {
      const invalid = {
        workspaceId: "   ",
        title: "Test",
      };
      const result = createDeliverySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid email formats", () => {
      const invalid = {
        workspaceId: "ws_1",
        title: "Test",
        clientEmail: "not-a-valid-email",
      };
      const result = createDeliverySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("accepts null or empty string for optional clientEmail", () => {
      const withNull = { workspaceId: "ws_1", title: "Test", clientEmail: null };
      const withEmpty = { workspaceId: "ws_1", title: "Test", clientEmail: "" };
      expect(createDeliverySchema.safeParse(withNull).success).toBe(true);
      expect(createDeliverySchema.safeParse(withEmpty).success).toBe(true);
    });
  });

  describe("verifyDeliveryPasscodeSchema", () => {
    it("validates valid share token and passcode", () => {
      const payload = {
        shareToken: "token_abc123",
        passcode: "1234",
      };
      const result = verifyDeliveryPasscodeSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects empty shareToken", () => {
      const payload = {
        shareToken: "   ",
      };
      const result = verifyDeliveryPasscodeSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("loadMoreDeliveryAssetsSchema", () => {
    it("requires either deliveryId or shareToken", () => {
      const validWithId = { deliveryId: "del_1" };
      const validWithToken = { shareToken: "token_1" };
      const invalidWithoutBoth = { page: 1, pageSize: 24 };

      expect(loadMoreDeliveryAssetsSchema.safeParse(validWithId).success).toBe(true);
      expect(loadMoreDeliveryAssetsSchema.safeParse(validWithToken).success).toBe(true);
      expect(loadMoreDeliveryAssetsSchema.safeParse(invalidWithoutBoth).success).toBe(false);
    });

    it("enforces pageSize boundaries (1 to 100)", () => {
      expect(
        loadMoreDeliveryAssetsSchema.safeParse({ deliveryId: "d1", pageSize: 101 }).success
      ).toBe(false);
      expect(
        loadMoreDeliveryAssetsSchema.safeParse({ deliveryId: "d1", pageSize: 0 }).success
      ).toBe(false);
      expect(
        loadMoreDeliveryAssetsSchema.safeParse({ deliveryId: "d1", pageSize: 50 }).success
      ).toBe(true);
    });
  });
});
