import { describe, expect, it, beforeEach } from "vitest";
import {
  __clearBrushStampCacheForTests,
  falloffAlpha,
  getBrushStampMask,
  stampCellAlpha,
} from "./brushStamp";

function maskGrid(shape: Parameters<typeof getBrushStampMask>[0], size: number, soft: number) {
  const mask = getBrushStampMask(shape, size, soft);
  const rows: number[][] = [];
  for (let y = 0; y < size; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < size; x += 1) {
      row.push(mask[y * size + x]!);
    }
    rows.push(row);
  }
  return rows;
}

describe("brush stamp masks", () => {
  beforeEach(() => {
    __clearBrushStampCacheForTests();
  });

  it("square size 1 is a single opaque pixel", () => {
    expect(maskGrid("square", 1, 0)).toEqual([[255]]);
    expect(maskGrid("square", 1, 100)).toEqual([[255]]);
  });

  it.each([2, 3, 4])("keeps the full square footprint at size %i with slight softness", (size) => {
    const mask = getBrushStampMask("square", size, 10);
    expect(mask).toHaveLength(size * size);
    expect([...mask].every((alpha) => alpha > 0)).toBe(true);
  });

  it("hard square/circle/diamond size 3 match discrete metrics", () => {
    expect(maskGrid("square", 3, 0)).toEqual([
      [255, 255, 255],
      [255, 255, 255],
      [255, 255, 255],
    ]);

    expect(maskGrid("circle", 3, 0)).toEqual([
      [0, 255, 0],
      [255, 255, 255],
      [0, 255, 0],
    ]);

    expect(maskGrid("diamond", 3, 0)).toEqual([
      [0, 255, 0],
      [255, 255, 255],
      [0, 255, 0],
    ]);
  });

  it("hard square size 5 is fully filled; soft square keeps square corners", () => {
    const hard = getBrushStampMask("square", 5, 0);
    expect([...hard].every((a) => a === 255)).toBe(true);

    // Softness 50: diagonal cell (1,1) is inside the hard Chebyshev core.
    // Area sampling feathers only the outer corner of that cell, so the square
    // stays near-opaque there while the circle is already in its falloff.
    const softSq = getBrushStampMask("square", 5, 50);
    const softCi = getBrushStampMask("circle", 5, 50);
    expect(softSq[12]).toBe(255);
    expect(softSq[6]).toBeGreaterThan(220);
    expect(softCi[6]!).toBeLessThan(softSq[6]!);
    expect(softCi[6]!).toBeGreaterThan(0);
  });

  it("Softness 0 is binary; Softness 100 has opaque center and soft edge", () => {
    const hard = getBrushStampMask("circle", 5, 0);
    expect([...hard].every((a) => a === 0 || a === 255)).toBe(true);

    const soft = getBrushStampMask("circle", 5, 100);
    expect(soft[12]).toBe(255); // center
    // The outer cell stays faintly visible so softness does not shrink the
    // nominal brush footprint.
    expect(soft[2]).toBeGreaterThan(0);
    expect(soft[2]).toBeLessThan(255);
    const mid = soft[7]!; // (2,1), t=0.5
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(255);
  });

  it("spreads a full-soft circle into an even ramp instead of a dark fringe", () => {
    const row = maskGrid("circle", 9, 100)[4]!;
    const profile = row.slice(4);
    for (let i = 1; i < profile.length; i += 1) {
      expect(profile[i]!).toBeLessThanOrEqual(profile[i - 1]!);
    }
    expect(profile[0]).toBe(255);
    expect(profile[profile.length - 1]!).toBeGreaterThan(0);
    expect(profile[profile.length - 1]!).toBeLessThan(80);
    // Two pixels out is near the middle of the radius, so alpha stays in the
    // mid range. The old quadratic curve crushed this cell well below 100.
    expect(profile[2]).toBeGreaterThan(100);
    expect(profile[2]).toBeLessThan(200);
  });
});

describe("falloffAlpha", () => {
  it("maps hardness bands", () => {
    expect(falloffAlpha(0, 1, 0)).toBe(255);
    expect(falloffAlpha(0.5, 1, 0)).toBe(255);
    expect(falloffAlpha(1.1, 0, 100)).toBe(0);
    expect(falloffAlpha(1, 0, 100)).toBe(0);
    expect(falloffAlpha(0, 0, 100)).toBe(255);
    expect(falloffAlpha(0.5, 0, 100)).toBe(128);
    expect(stampCellAlpha("square", 5, 50, 2, 2)).toBe(255);
  });
});
