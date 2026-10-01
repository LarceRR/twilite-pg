import { describe, expect, it } from "vitest";
import { CANVAS_BYTE_LENGTH, CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import {
  blitNativeRect,
  clampRectIntersectingSheet,
  clampRectToSheet,
  extractNativeRect,
  maxAspectRectInSheet,
  nextAdjacentRect,
  resizeDraftRect,
  sampleNativeRectToCanvas,
  type NativeCropRect,
} from "./storyboardCrop";

function rgbaGrid(width: number, height: number, fill: [number, number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    data[o] = fill[0];
    data[o + 1] = fill[1];
    data[o + 2] = fill[2];
    data[o + 3] = fill[3];
  }
  return data;
}

describe("resizeDraftRect", () => {
  const origin: NativeCropRect = { x: 10, y: 20, w: 8, h: 6 };

  it("grows a side only toward that side", () => {
    expect(resizeDraftRect(origin, "e", 4, 9, false)).toEqual({ x: 10, y: 20, w: 12, h: 6 });
    expect(resizeDraftRect(origin, "w", -3, 9, false)).toEqual({ x: 7, y: 20, w: 11, h: 6 });
    expect(resizeDraftRect(origin, "s", 9, 2, false)).toEqual({ x: 10, y: 20, w: 8, h: 8 });
    expect(resizeDraftRect(origin, "n", 9, -2, false)).toEqual({ x: 10, y: 18, w: 8, h: 8 });
  });

  it("grows a corner toward that corner and keeps the opposite corner", () => {
    expect(resizeDraftRect(origin, "se", 4, 3, false)).toEqual({ x: 10, y: 20, w: 12, h: 9 });
    expect(resizeDraftRect(origin, "nw", -2, -1, false)).toEqual({ x: 8, y: 19, w: 10, h: 7 });
  });

  it("grows the dragged edge and its opposite when symmetric", () => {
    expect(resizeDraftRect(origin, "e", 2, 0, true)).toEqual({ x: 8, y: 20, w: 12, h: 6 });
    expect(resizeDraftRect(origin, "n", 0, -2, true)).toEqual({ x: 10, y: 18, w: 8, h: 10 });
    expect(resizeDraftRect(origin, "se", 2, 1, true)).toEqual({ x: 8, y: 19, w: 12, h: 8 });
  });

  it("keeps the anchored edge when the drag collapses the rect", () => {
    expect(resizeDraftRect(origin, "w", 100, 0, false)).toEqual({ x: 17, y: 20, w: 1, h: 6 });
    expect(resizeDraftRect(origin, "n", 0, 100, false)).toEqual({ x: 10, y: 25, w: 8, h: 1 });
  });
});

describe("storyboardCrop", () => {
  it("maxAspectRectInSheet fits square aspect in wide sheet", () => {
    const rect = maxAspectRectInSheet(40, 10, 1, 1);
    expect(rect.w).toBe(10);
    expect(rect.h).toBe(10);
    expect(rect.x + rect.w).toBeLessThanOrEqual(40);
    expect(rect.y + rect.h).toBeLessThanOrEqual(10);
  });

  it("clampRectIntersectingSheet lets the crop hang past the sheet", () => {
    const clamped = clampRectIntersectingSheet({ x: -8, y: 2, w: 20, h: 10 }, 30, 30);
    expect(clamped).toEqual({ x: -8, y: 2, w: 20, h: 10 });
    const stuck = clampRectIntersectingSheet({ x: -40, y: 40, w: 20, h: 10 }, 30, 30);
    expect(stuck.x).toBe(-19);
    expect(stuck.y).toBe(29);
  });

  it("extract keeps overhang as transparent so an edge frame can be centered", () => {
    const native = rgbaGrid(4, 4, [255, 0, 0, 255]);
    const crop = extractNativeRect(native, 4, 4, { x: -2, y: 0, w: 4, h: 2 });
    expect(crop.width).toBe(4);
    expect(crop.height).toBe(2);
    expect(crop.pixels[3]).toBe(0);
    expect(crop.pixels[2 * 4 + 3]).toBe(255);
  });

  it("clampRectToSheet keeps rect inside bounds", () => {
    const rect: NativeCropRect = { x: 100, y: 50, w: 20, h: 20 };
    const clamped = clampRectToSheet(rect, 30, 30);
    expect(clamped.x).toBeLessThanOrEqual(10);
    expect(clamped.y).toBeLessThanOrEqual(10);
    expect(clamped.w).toBeLessThanOrEqual(30);
    expect(clamped.h).toBeLessThanOrEqual(30);
  });

  it("nextAdjacentRect steps right then wraps down", () => {
    expect(nextAdjacentRect({ x: 0, y: 0, w: 10, h: 8 }, 30, 20)).toEqual({
      x: 10,
      y: 0,
      w: 10,
      h: 8,
    });
    expect(nextAdjacentRect({ x: 20, y: 0, w: 10, h: 8 }, 30, 20)).toEqual({
      x: 0,
      y: 8,
      w: 10,
      h: 8,
    });
    expect(nextAdjacentRect({ x: 20, y: 12, w: 10, h: 8 }, 30, 20)).toEqual({
      x: 20,
      y: 12,
      w: 10,
      h: 8,
    });
  });

  it("blits a smaller crop 1:1 into the frame field", () => {
    const native = rgbaGrid(4, 2, [9, 8, 7, 255]);
    const out = blitNativeRect(native, 4, 2, { x: 0, y: 0, w: 2, h: 1 }, 2, 2);
    expect(out).toHaveLength(2 * 2 * 4);
    expect(out[0]).toBe(9);
    expect(out[3]).toBe(255);
    expect(out[8]).toBe(0);
    expect(out[11]).toBe(0);
  });

  it("sampleNativeRectToCanvas returns canvas-sized buffer", () => {
    const native = rgbaGrid(4, 4, [255, 0, 0, 255]);
    const out = sampleNativeRectToCanvas(
      native,
      4,
      4,
      { x: 0, y: 0, w: 2, h: 2 },
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );
    expect(out.length).toBe(CANVAS_BYTE_LENGTH);
  });

  it("sampleNativeRectToCanvas uses different crop sizes with same output dimensions", () => {
    const native = rgbaGrid(8, 8, [0, 255, 0, 255]);
    const a = sampleNativeRectToCanvas(
      native,
      8,
      8,
      { x: 0, y: 0, w: 4, h: 4 },
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );
    const b = sampleNativeRectToCanvas(
      native,
      8,
      8,
      { x: 2, y: 2, w: 2, h: 2 },
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );
    expect(a.length).toBe(CANVAS_BYTE_LENGTH);
    expect(b.length).toBe(CANVAS_BYTE_LENGTH);
  });
});
