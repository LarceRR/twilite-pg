import { describe, expect, it } from "vitest";

import {
  canvasOversizeReason,
  centerCropFrame,
  centerCropRect,
  downscaleFrame,
  exceedsCanvasMax,
  nearestDownscaleSize,
  resampleNearest,
} from "./canvasFit";

describe("canvasFit", () => {
  it("reports an exact oversize reason and never for ≤ max", () => {
    expect(exceedsCanvasMax({ width: 160, height: 160 }, 160)).toBe(false);
    expect(canvasOversizeReason({ width: 160, height: 160 }, 160)).toBeNull();
    expect(canvasOversizeReason({ width: 320, height: 200 }, 160)).toMatch(/320×200/);
    expect(canvasOversizeReason({ width: 320, height: 200 }, 160)).toMatch(/160×160/);
  });

  it("computes nearest downscale inside the max box", () => {
    expect(nearestDownscaleSize({ width: 320, height: 200 }, 160)).toEqual({
      width: 160,
      height: 100,
    });
    expect(nearestDownscaleSize({ width: 100, height: 100 }, 160)).toEqual({
      width: 100,
      height: 100,
    });
  });

  it("center-crops the largest square-or-rect within max", () => {
    expect(centerCropRect({ width: 320, height: 200 }, 160)).toEqual({
      x: 80,
      y: 20,
      width: 160,
      height: 160,
    });
  });

  it("downscales pixels with nearest sampling", () => {
    const src = new Uint8ClampedArray(4 * 4 * 4);
    src[0] = 10;
    src[3] = 255;
    src[(3 * 4 + 3) * 4] = 20;
    src[(3 * 4 + 3) * 4 + 3] = 255;
    const { pixels, size } = downscaleFrame(src, { width: 4, height: 4 }, 2);
    expect(size).toEqual({ width: 2, height: 2 });
    expect(pixels.length).toBe(2 * 2 * 4);
    expect(resampleNearest(src, 4, 4, 2, 2).length).toBe(16);
  });

  it("center-crops pixels without silently changing when already small", () => {
    const src = new Uint8ClampedArray(2 * 2 * 4);
    src[0] = 7;
    src[3] = 255;
    const { pixels, size } = centerCropFrame(src, { width: 2, height: 2 }, 160);
    expect(size).toEqual({ width: 2, height: 2 });
    expect(pixels[0]).toBe(7);
  });
});
