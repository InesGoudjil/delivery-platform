import { describe, it, expect, vi } from "vitest";
import { Toaster, toast } from "@/components/ui/sonner";
import {
  formatUploadBytes,
  renderUploadProgressDescription,
  createUploadProgressToast,
} from "@/lib/upload-toast";

describe("components/ui/sonner", () => {
  it("exports Toaster component and toast function", () => {
    expect(Toaster).toBeDefined();
    expect(toast).toBeDefined();
    expect(typeof toast.loading).toBe("function");
    expect(typeof toast.success).toBe("function");
    expect(typeof toast.error).toBe("function");
    expect(typeof toast.dismiss).toBe("function");
  });
});

describe("lib/upload-toast", () => {
  describe("formatUploadBytes", () => {
    it("formats bytes into human readable units", () => {
      expect(formatUploadBytes(0)).toBe("0 B");
      expect(formatUploadBytes(-50)).toBe("0 B");
      expect(formatUploadBytes(500)).toBe("500 B");
      expect(formatUploadBytes(1024)).toBe("1 KB");
      expect(formatUploadBytes(1024 * 1024 * 5)).toBe("5 MB");
      expect(formatUploadBytes(1024 * 1024 * 1024 * 1.5)).toBe("1.5 GB");
    });
  });

  describe("renderUploadProgressDescription", () => {
    it("returns a JSX element tree with progress percentage and file name", () => {
      const vdom = renderUploadProgressDescription({
        fileName: "film_final_cut.mp4",
        percentage: 64.7,
        loadedBytes: 64 * 1024 * 1024,
        totalBytes: 100 * 1024 * 1024,
      });

      expect(vdom).toBeDefined();
      expect(vdom.type).toBe("div");
      expect(vdom.props.className).toContain("w-full space-y-2");
    });

    it("clamps percentage values between 0 and 100", () => {
      const underflow = renderUploadProgressDescription({
        fileName: "test.mp4",
        percentage: -25,
      });
      const overflow = renderUploadProgressDescription({
        fileName: "test.mp4",
        percentage: 150,
      });

      expect(underflow).toBeDefined();
      expect(overflow).toBeDefined();
    });
  });

  describe("createUploadProgressToast", () => {
    it("creates upload toast controller with liquid-glass className", () => {
      const loadingSpy = vi.spyOn(toast, "loading").mockReturnValue("toast-id-1");
      const successSpy = vi.spyOn(toast, "success").mockReturnValue("toast-id-1");
      const errorSpy = vi.spyOn(toast, "error").mockReturnValue("toast-id-1");
      const dismissSpy = vi.spyOn(toast, "dismiss").mockReturnValue(undefined as any);

      const controller = createUploadProgressToast("custom-toast-id");
      expect(controller.id).toBe("custom-toast-id");

      controller.start({
        fileName: "teaser.mov",
        percentage: 10,
      });

      expect(loadingSpy).toHaveBeenCalledWith(
        "Uploading teaser.mov",
        expect.objectContaining({
          id: "custom-toast-id",
          className: "liquid-glass",
        })
      );

      controller.update({
        fileName: "teaser.mov",
        percentage: 50,
      });

      expect(loadingSpy).toHaveBeenCalledWith(
        "Uploading teaser.mov",
        expect.objectContaining({
          id: "custom-toast-id",
          className: "liquid-glass",
        })
      );

      controller.success("Upload finished!");
      expect(successSpy).toHaveBeenCalledWith(
        "Upload finished!",
        expect.objectContaining({
          id: "custom-toast-id",
          className: "liquid-glass",
        })
      );

      controller.error("Upload failed");
      expect(errorSpy).toHaveBeenCalledWith(
        "Upload failed",
        expect.objectContaining({
          id: "custom-toast-id",
          className: "liquid-glass",
        })
      );

      controller.dismiss();
      expect(dismissSpy).toHaveBeenCalledWith("custom-toast-id");

      vi.restoreAllMocks();
    });
  });
});
