import { describe, expect, it } from "vitest";
import { frameDragHoverIndex, frameDragShift } from "./useFrameStripDrag";

describe("frameDragShift", () => {
  it("slides later frames left when the dragged frame moves right", () => {
    expect(frameDragShift(1, 0, 2)).toBe(-1);
    expect(frameDragShift(2, 0, 2)).toBe(-1);
    expect(frameDragShift(0, 0, 2)).toBe(0);
    expect(frameDragShift(3, 0, 2)).toBe(0);
  });

  it("slides earlier frames right when the dragged frame moves left", () => {
    expect(frameDragShift(0, 2, 0)).toBe(1);
    expect(frameDragShift(1, 2, 0)).toBe(1);
    expect(frameDragShift(2, 2, 0)).toBe(0);
  });
});

describe("frameDragHoverIndex", () => {
  it("switches slot at the halfway point and stays inside the strip", () => {
    expect(frameDragHoverIndex(0, 100, 4)).toBe(0);
    expect(frameDragHoverIndex(49, 100, 4)).toBe(0);
    expect(frameDragHoverIndex(50, 100, 4)).toBe(1);
    expect(frameDragHoverIndex(900, 100, 4)).toBe(3);
    expect(frameDragHoverIndex(-20, 100, 4)).toBe(0);
  });
});
