import { describe, expect, it } from "vitest";
import {
  compositeCoverageErase,
  compositeCoveragePaint,
  stampMaskIntoCoverage,
} from "./strokeCoverage";
import { getBrushStampMask } from "./brushStamp";

describe("stroke coverage", () => {
  it("accumulates with max alpha, not additive overflow", () => {
    const coverage = new Uint8Array(3 * 3);
    const mask = getBrushStampMask("circle", 3, 100);
    stampMaskIntoCoverage(coverage, 3, 3, 1, 1, mask, 3);
    const mid = coverage[4]!;
    stampMaskIntoCoverage(coverage, 3, 3, 1, 1, mask, 3);
    expect(coverage[4]).toBe(mid);
    expect(coverage[4]).toBeLessThanOrEqual(255);
  });

  it("source-over paint composites soft alpha onto existing pixels", () => {
    const base = new Uint8ClampedArray(4);
    base[0] = 0;
    base[1] = 0;
    base[2] = 255;
    base[3] = 255;
    const dest = new Uint8ClampedArray(4);
    const coverage = new Uint8Array([128]);
    compositeCoveragePaint(dest, base, coverage, 1, 1, [255, 0, 0, 255]);
    expect(dest[3]).toBeGreaterThan(128);
    expect(dest[0]).toBeGreaterThan(0);
    expect(dest[2]).toBeGreaterThan(0);
  });

  it("soft erase reduces alpha without inventing color fringing at zero", () => {
    const base = new Uint8ClampedArray([10, 20, 30, 200]);
    const dest = new Uint8ClampedArray(4);
    const coverage = new Uint8Array([255]);
    compositeCoverageErase(dest, base, coverage, 1, 1);
    expect([...dest]).toEqual([0, 0, 0, 0]);

    const partial = new Uint8ClampedArray(4);
    compositeCoverageErase(partial, base, new Uint8Array([128]), 1, 1);
    expect(partial[0]).toBe(10);
    expect(partial[1]).toBe(20);
    expect(partial[2]).toBe(30);
    expect(partial[3]).toBe(Math.round(200 * (1 - 128 / 255)));
  });
});
