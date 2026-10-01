import { describe, expect, it } from "vitest";
import { mirrorSide, placeTooltip, type Box, type Side, type Size } from "./placeTooltip";

const viewport: Box = { x: 0, y: 0, width: 800, height: 600 };

function inside(anchor: Box, size: Size, preferred: Side) {
  const placed = placeTooltip(anchor, size, viewport, preferred, 8, 8);
  expect(placed).not.toBeNull();
  const width = Math.min(size.width, placed!.maxWidth);
  const height = Math.min(size.height, placed!.maxHeight);
  expect(placed!.left).toBeGreaterThanOrEqual(8);
  expect(placed!.top).toBeGreaterThanOrEqual(8);
  expect(placed!.left + width).toBeLessThanOrEqual(792);
  expect(placed!.top + height).toBeLessThanOrEqual(592);
  return placed!;
}

describe("placeTooltip", () => {
  it("stays on top when the anchor has room above", () => {
    const placed = inside({ x: 360, y: 300, width: 80, height: 32 }, { width: 120, height: 40 }, "top");
    expect(placed.side).toBe("top");
    expect(placed.top).toBe(252);
    expect(placed.left).toBe(340);
  });

  it("flips below an anchor that touches the top edge", () => {
    const placed = inside({ x: 100, y: 4, width: 40, height: 20 }, { width: 120, height: 80 }, "top");
    expect(placed.side).toBe("bottom");
    expect(placed.top).toBe(32);
  });

  it("flips to the right when the left side cannot fit", () => {
    const placed = inside({ x: 10, y: 200, width: 30, height: 20 }, { width: 100, height: 40 }, "left");
    expect(placed.side).toBe("right");
  });

  it("shifts a wide tooltip back inside the left edge", () => {
    const placed = inside({ x: 0, y: 200, width: 20, height: 20 }, { width: 180, height: 40 }, "top");
    expect(placed.side).toBe("top");
    expect(placed.left).toBe(8);
  });

  it("shifts a wide tooltip back inside the right edge", () => {
    const placed = inside({ x: 760, y: 200, width: 30, height: 20 }, { width: 180, height: 40 }, "top");
    expect(placed.side).toBe("top");
    expect(placed.left + Math.min(180, placed.maxWidth)).toBeLessThanOrEqual(792);
  });

  it("caps the main axis when every side is shorter than the tooltip", () => {
    const short: Box = { x: 0, y: 0, width: 200, height: 120 };
    const placed = placeTooltip({ x: 80, y: 10, width: 40, height: 20 }, { width: 80, height: 200 }, short, "top", 8, 8);
    expect(placed?.side).toBe("bottom");
    expect(placed!.maxHeight).toBeLessThan(200);
    expect(placed!.top + Math.min(200, placed!.maxHeight)).toBeLessThanOrEqual(112);
  });

  it("hides the tooltip when the anchor is fully outside the viewport", () => {
    expect(placeTooltip({ x: -200, y: -80, width: 40, height: 20 }, { width: 80, height: 24 }, viewport, "top", 8, 8)).toBeNull();
  });

  it("keeps a partially visible anchor", () => {
    expect(placeTooltip({ x: 10, y: -5, width: 20, height: 20 }, { width: 40, height: 16 }, viewport, "bottom", 8, 8)?.side).toBe("bottom");
  });
});

describe("mirrorSide", () => {
  it("swaps horizontal sides in rtl", () => {
    expect(mirrorSide("left", true)).toBe("right");
    expect(mirrorSide("right", true)).toBe("left");
    expect(mirrorSide("top", true)).toBe("top");
    expect(mirrorSide("left", false)).toBe("left");
  });
});
