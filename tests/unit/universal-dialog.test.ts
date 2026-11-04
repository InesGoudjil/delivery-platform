import { describe, it, expect } from "vitest";
import {
  UniversalDialog,
  UniversalDialogRoot,
  UniversalDialogTrigger,
  UniversalDialogPortal,
  UniversalDialogOverlay,
  UniversalDialogContent,
  UniversalDialogHeader,
  UniversalDialogTitle,
  UniversalDialogDescription,
  UniversalDialogBody,
  UniversalDialogFooter,
  UniversalDialogClose,
  universalDialogSizes,
} from "@/components/ui/universal-dialog";

describe("components/ui/universal-dialog", () => {
  it("defines standard responsive sizes mapping to max-width utility classes", () => {
    expect(universalDialogSizes.sm).toBe("sm:max-w-sm");
    expect(universalDialogSizes.md).toBe("sm:max-w-md");
    expect(universalDialogSizes.lg).toBe("sm:max-w-lg");
    expect(universalDialogSizes.xl).toBe("sm:max-w-xl");
    expect(universalDialogSizes["2xl"]).toBe("sm:max-w-2xl");
    expect(universalDialogSizes["3xl"]).toBe("sm:max-w-3xl");
    expect(universalDialogSizes["4xl"]).toBe("sm:max-w-4xl");
    expect(universalDialogSizes["5xl"]).toBe("sm:max-w-5xl");
    expect(universalDialogSizes.full).toBe(
      "sm:max-w-[calc(100vw-2rem)] sm:h-[calc(100dvh-2rem)]"
    );
  });

  it("exports all named primitive components", () => {
    expect(typeof UniversalDialog).toBe("function");
    expect(typeof UniversalDialogRoot).toBe("function");
    expect(typeof UniversalDialogTrigger).toBe("function");
    expect(typeof UniversalDialogPortal).toBe("function");
    expect(typeof UniversalDialogOverlay).toBe("function");
    expect(typeof UniversalDialogContent).toBe("function");
    expect(typeof UniversalDialogHeader).toBe("function");
    expect(typeof UniversalDialogTitle).toBe("function");
    expect(typeof UniversalDialogDescription).toBe("function");
    expect(typeof UniversalDialogBody).toBe("function");
    expect(typeof UniversalDialogFooter).toBe("function");
    expect(typeof UniversalDialogClose).toBe("function");
  });

  it("attaches all primitives as compound properties on UniversalDialog", () => {
    expect(UniversalDialog.Root).toBe(UniversalDialogRoot);
    expect(UniversalDialog.Trigger).toBe(UniversalDialogTrigger);
    expect(UniversalDialog.Portal).toBe(UniversalDialogPortal);
    expect(UniversalDialog.Overlay).toBe(UniversalDialogOverlay);
    expect(UniversalDialog.Content).toBe(UniversalDialogContent);
    expect(UniversalDialog.Header).toBe(UniversalDialogHeader);
    expect(UniversalDialog.Title).toBe(UniversalDialogTitle);
    expect(UniversalDialog.Description).toBe(UniversalDialogDescription);
    expect(UniversalDialog.Body).toBe(UniversalDialogBody);
    expect(UniversalDialog.Footer).toBe(UniversalDialogFooter);
    expect(UniversalDialog.Close).toBe(UniversalDialogClose);
  });

  it("renders UniversalDialog component tree without error", () => {
    const vdom = UniversalDialog({
      open: true,
      onOpenChange: () => {},
      title: "Test Dialog",
      description: "Test Description",
      size: "lg",
      children: "Dialog Body Content",
    });

    expect(vdom).toBeDefined();
    expect(vdom.type).toBe(UniversalDialogRoot);
    expect(vdom.props.open).toBe(true);
  });

  it("exports DeliveriesHeader component properly", async () => {
    const { DeliveriesHeader } = await import(
      "@/app/(workspace)/[workspaceSlug]/deliveries/_components/deliveries-header"
    );
    expect(typeof DeliveriesHeader).toBe("function");
  });
});
