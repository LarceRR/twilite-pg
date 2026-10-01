import { describe, expect, it } from "vitest";
import { resolveSelectionStroke } from "./selection";
import {
  applyBoolean,
  createEmptyMask,
  createFullMask,
  fillEllipse,
  fillLassoPolygon,
  fillRect,
  maskBBox,
  maskHitTest,
  maskIsEmpty,
  normalizeDraftRect,
  normalizeMask,
  rasterizeDraftShape,
} from "./selectionMask";

function dump(mask: Uint8Array, w: number, h: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      row += mask[y * w + x]! ? "#" : ".";
    }
    rows.push(row);
  }
  return rows;
}

describe("fillRect", () => {
  it("fills inclusive rect and normalizes inverted drags", () => {
    const mask = createEmptyMask(5, 5);
    expect(fillRect(mask, 5, 5, 1, 1, 3, 2)).toBe(true);
    expect(dump(mask, 5, 5)).toEqual([
      ".....",
      ".###.",
      ".###.",
      ".....",
      ".....",
    ]);

    const inv = createEmptyMask(5, 5);
    fillRect(inv, 5, 5, 3, 2, 1, 1);
    expect(dump(inv, 5, 5)).toEqual(dump(mask, 5, 5));
  });

  it("keeps a 1×1 selection", () => {
    const mask = createEmptyMask(3, 3);
    expect(fillRect(mask, 3, 3, 1, 1, 1, 1)).toBe(true);
    expect(mask[1 * 3 + 1]).toBe(1);
    expect(maskBBox(mask, 3, 3)).toEqual({ x: 1, y: 1, w: 1, h: 1 });
  });

  it("clips off-canvas corners", () => {
    const mask = createEmptyMask(4, 4);
    fillRect(mask, 4, 4, -2, -2, 1, 1);
    expect(dump(mask, 4, 4)).toEqual([
      "##..",
      "##..",
      "....",
      "....",
    ]);
  });
});

describe("fillEllipse", () => {
  it("fills a centered circle on a 10×10 bbox", () => {
    const mask = createEmptyMask(10, 10);
    fillEllipse(mask, 10, 10, 0, 0, 9, 9);
    // Analytical pixel-center ≤1 with continuum center (min+max+1)/2.
    expect(dump(mask, 10, 10)).toEqual([
      "...####...",
      ".########.",
      ".########.",
      "##########",
      "##########",
      "##########",
      "##########",
      ".########.",
      ".########.",
      "...####...",
    ]);
  });

  it("fills 1×1 degenerate ellipse", () => {
    const mask = createEmptyMask(3, 3);
    expect(fillEllipse(mask, 3, 3, 1, 1, 1, 1)).toBe(true);
    expect(maskHitTest(mask, 3, 3, 1, 1)).toBe(true);
  });

  it("fills a flat 1×N ellipse as a continuous strip", () => {
    const mask = createEmptyMask(8, 3);
    fillEllipse(mask, 8, 3, 1, 1, 6, 1);
    expect(dump(mask, 8, 3)).toEqual([
      "........",
      ".######.",
      "........",
    ]);
  });
});

describe("fillLassoPolygon", () => {
  it("fills a triangle (≥3 points)", () => {
    const mask = createEmptyMask(5, 5);
    expect(
      fillLassoPolygon(mask, 5, 5, [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 2, y: 4 },
      ]),
    ).toBe(true);
    expect(maskIsEmpty(mask)).toBe(false);
    expect(maskHitTest(mask, 5, 5, 2, 1)).toBe(true);
  });

  it("rejects fewer than 3 points", () => {
    const mask = createEmptyMask(4, 4);
    expect(fillLassoPolygon(mask, 4, 4, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(
      false,
    );
  });

  it("uses even-odd fill for a self-intersecting bow-tie", () => {
    const mask = createEmptyMask(7, 7);
    fillLassoPolygon(mask, 7, 7, [
      { x: 0, y: 0 },
      { x: 6, y: 6 },
      { x: 0, y: 6 },
      { x: 6, y: 0 },
    ]);
    // Golden: even-odd hourglass lobes + path pixels.
    expect(dump(mask, 7, 7)).toEqual([
      "#####.#",
      ".###...",
      "..#....",
      "..#....",
      ".###...",
      "#####..",
      "#.....#",
    ]);
  });
});

describe("applyBoolean", () => {
  it("replace / add / subtract and nulls empty results", () => {
    const a = createEmptyMask(4, 4);
    fillRect(a, 4, 4, 0, 0, 2, 2);
    const b = createEmptyMask(4, 4);
    fillRect(b, 4, 4, 1, 1, 3, 3);

    const replaced = applyBoolean(a, b, "replace")!;
    expect(dump(replaced, 4, 4)).toEqual([
      "....",
      ".###",
      ".###",
      ".###",
    ]);

    const added = applyBoolean(a, b, "add")!;
    expect(dump(added, 4, 4)).toEqual([
      "###.",
      "####",
      "####",
      ".###",
    ]);

    const sub = applyBoolean(a, b, "subtract")!;
    expect(dump(sub, 4, 4)).toEqual([
      "###.",
      "#...",
      "#...",
      "....",
    ]);

    const clear = applyBoolean(a, createFullMask(4, 4), "subtract");
    expect(clear).toBeNull();
    expect(normalizeMask(createEmptyMask(2, 2))).toBeNull();
  });

  it("treats add on null as replace; subtract on null as no-op", () => {
    const next = createEmptyMask(2, 2);
    fillRect(next, 2, 2, 0, 0, 0, 0);
    expect(applyBoolean(null, next, "add")).not.toBeNull();
    expect(applyBoolean(null, next, "subtract")).toBeNull();
  });
});

describe("normalizeDraftRect + rasterize", () => {
  it("constrains to square from max abs delta", () => {
    expect(normalizeDraftRect(2, 2, 5, 3, true)).toEqual({
      minX: 2,
      minY: 2,
      maxX: 5,
      maxY: 5,
    });
  });

  it("rasterizes rect and ellipse drafts", () => {
    const rect = rasterizeDraftShape(
      "rect",
      { x0: 0, y0: 0, x1: 1, y1: 1 },
      3,
      3,
    )!;
    expect(dump(rect, 3, 3)).toEqual(["##.", "##.", "..."]);

    const circle = rasterizeDraftShape(
      "ellipse",
      { x0: 0, y0: 0, x1: 2, y1: 2, constrain: true },
      3,
      3,
    )!;
    expect(maskIsEmpty(circle)).toBe(false);
  });
});

describe("resolveSelectionStroke", () => {
  it("maps Alt to subtract and Shift to add when mask exists", () => {
    expect(
      resolveSelectionStroke("replace", true, { shift: true, alt: false }),
    ).toEqual({ effective: "add", constrainSquareOrCircle: false });

    expect(
      resolveSelectionStroke("replace", false, { shift: true, alt: false }),
    ).toEqual({ effective: "replace", constrainSquareOrCircle: true });

    expect(
      resolveSelectionStroke("add", false, { shift: false, alt: true }),
    ).toEqual({ effective: "subtract", constrainSquareOrCircle: false });

    expect(
      resolveSelectionStroke("subtract", true, { shift: true, alt: true }),
    ).toEqual({ effective: "subtract", constrainSquareOrCircle: false });
  });
});
