import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ModalContext,
  ModalProvider,
  useModals,
  ConfirmModal,
  useConfirmModal,
  NewDeliveryModal,
} from "@/components/modals";

// Mock next/navigation for ModalProvider client behavior
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/acme-media"),
  useSearchParams: vi.fn(() => new URLSearchParams("")),
}));

// Mock child dialogs inside ModalProvider so rendering is lightweight and doesn't mount Radix primitives
vi.mock("@/components/workspaces/trash-bin-dialog", () => ({
  TrashBinDialog: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="mock-trash-bin-dialog">Trash Bin Open</div> : null
  ),
}));

vi.mock("@/components/modals/new-delivery-modal", () => ({
  NewDeliveryModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="mock-new-delivery-modal">New Delivery Open</div> : null
  ),
}));

describe("components/modals", () => {
  const mockWorkspace = {
    id: "ws-123",
    brandName: "Acme Studios",
    slug: "acme-studios",
  };

  describe("Barrel Exports", () => {
    it("exports all modal contexts, providers, hooks, and modal components", () => {
      expect(typeof ModalContext).toBe("object");
      expect(typeof ModalProvider).toBe("function");
      expect(typeof useModals).toBe("function");
      expect(typeof ConfirmModal).toBe("function");
      expect(typeof useConfirmModal).toBe("function");
      expect(typeof NewDeliveryModal).toBe("function");
    });
  });

  describe("useModals resilient fallback", () => {
    it("returns safe no-op defaults without throwing when used outside of ModalProvider", () => {
      let outsideContext: ReturnType<typeof useModals> | null = null;
      function ConsumerWithoutProvider() {
        outsideContext = useModals();
        return <div>Outside Provider</div>;
      }

      const html = renderToStaticMarkup(<ConsumerWithoutProvider />);
      expect(html).toContain("Outside Provider");
      expect(outsideContext).not.toBeNull();
      expect(outsideContext?.showTrashModal).toBe(false);
      expect(outsideContext?.showNewDeliveryModal).toBe(false);
      expect(typeof outsideContext?.setShowTrashModal).toBe("function");
      expect(typeof outsideContext?.setShowNewDeliveryModal).toBe("function");
      // Safe no-op calls should not throw
      expect(() => outsideContext?.setShowTrashModal(true)).not.toThrow();
      expect(() => outsideContext?.setShowNewDeliveryModal(true)).not.toThrow();
    });
  });

  describe("ModalProvider", () => {
    it("renders children successfully within ModalProvider", () => {
      const html = renderToStaticMarkup(
        <ModalProvider workspace={mockWorkspace}>
          <div data-testid="child-content">Workspace Content</div>
        </ModalProvider>
      );

      expect(html).toContain("Workspace Content");
    });

    it("supplies the workspace and modal control states to context consumers", () => {
      let capturedContext: ReturnType<typeof useModals> | null = null;

      function TestConsumer() {
        const ctx = useModals();
        capturedContext = ctx;
        return (
          <div>
            <span>Workspace: {ctx.workspace.brandName}</span>
            <span>Slug: {ctx.workspace.slug}</span>
          </div>
        );
      }

      const html = renderToStaticMarkup(
        <ModalProvider workspace={mockWorkspace}>
          <TestConsumer />
        </ModalProvider>
      );

      expect(html).toContain("Workspace: Acme Studios");
      expect(html).toContain("Slug: acme-studios");
      expect(capturedContext).not.toBeNull();
      expect(capturedContext?.workspace.id).toBe("ws-123");
      expect(capturedContext?.showTrashModal).toBe(false);
      expect(capturedContext?.showNewDeliveryModal).toBe(false);
      expect(typeof capturedContext?.setShowTrashModal).toBe("function");
      expect(typeof capturedContext?.setShowNewDeliveryModal).toBe("function");
    });
  });

  describe("useConfirmModal & ConfirmModal", () => {
    it("exports useConfirmModal providing state and a bound ConfirmModal element", () => {
      function ConfirmHarness() {
        const { isOpen, confirmModal } = useConfirmModal({
          title: "Delete Deliverable",
          description: "Are you sure you want to delete this deliverable?",
          itemName: "Final Cut v2.mp4",
          variant: "danger",
          confirmText: "Delete",
          onConfirm: () => {},
        });

        return (
          <div>
            <span>State: {isOpen ? "open" : "closed"}</span>
            {confirmModal}
          </div>
        );
      }

      const html = renderToStaticMarkup(<ConfirmHarness />);
      expect(html).toContain("State: closed");
    });
  });
});
