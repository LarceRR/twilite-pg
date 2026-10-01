import { describe, expect, it, vi } from "vitest";
import {
  createMobileSurface,
  isSupportedTpoMajor,
  nextLoopIndex,
  sheetFrameOrigin,
} from "./mobileRuntime";

describe("mobile TPO runtime", () => {
  it("accepts major v1 and rejects other majors", () => {
    expect(isSupportedTpoMajor("twilite.pixelobject/v1")).toBe(true);
    expect(isSupportedTpoMajor("twilite.pixelobject/v1.2")).toBe(true);
    expect(isSupportedTpoMajor("twilite.pixelobject/v2")).toBe(false);
    expect(isSupportedTpoMajor("image/gif")).toBe(false);
  });

  it("maps a frame index onto the sheet grid", () => {
    expect(sheetFrameOrigin(0, 4, 160, 160)).toEqual({ sx: 0, sy: 0 });
    expect(sheetFrameOrigin(3, 4, 160, 160)).toEqual({ sx: 480, sy: 0 });
    expect(sheetFrameOrigin(5, 4, 160, 160)).toEqual({ sx: 160, sy: 160 });
  });

  it("loops the default clip", () => {
    expect(nextLoopIndex(0, 1)).toBe(0);
    expect(nextLoopIndex(2, 3)).toBe(0);
    expect(nextLoopIndex(0, 3)).toBe(1);
  });

  it("does not decode an unknown major", async () => {
    const surface = createMobileSurface();
    const load = vi.fn();
    await expect(surface.mount("twilite.pixelobject/v2", load)).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("closes the decoded sheet when the surface leaves the screen", async () => {
    const surface = createMobileSurface();
    const close = vi.fn();
    const decoded = await surface.mount("twilite.pixelobject/v1", async () => ({ close }));
    expect(decoded).not.toBeNull();
    surface.unmount();
    expect(close).toHaveBeenCalledOnce();
  });

  it("closes a sheet that finishes decoding after the surface was unloaded", async () => {
    const surface = createMobileSurface();
    let finish: (sheet: { close: () => void }) => void = () => {};
    const close = vi.fn();
    const pending = surface.mount(
      "twilite.pixelobject/v1",
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    surface.unmount();
    finish({ close });
    await expect(pending).resolves.toBeNull();
    expect(close).toHaveBeenCalledOnce();
  });
});
