import { describe, expect, it } from "vitest";
import { blendPremult, compositeLayers } from "./composite";
import { createEmptyPixels } from "./pixels";

function rgbaBuffer(
  width: number,
  height: number,
  fill: [number, number, number, number],
): Uint8ClampedArray<ArrayBuffer> {
  const pixels = createEmptyPixels(width, height);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    pixels[o] = fill[0];
    pixels[o + 1] = fill[1];
    pixels[o + 2] = fill[2];
    pixels[o + 3] = fill[3];
  }
  return pixels;
}

describe("blendPremult normal", () => {
  it("composites opaque red over opaque blue as red", () => {
    const out = blendPremult(
      "normal",
      { r: 1, g: 0, b: 0, a: 1 },
      { r: 0, g: 0, b: 1, a: 1 },
    );
    expect(out.a).toBeCloseTo(1);
    expect(out.r).toBeCloseTo(1);
    expect(out.b).toBeCloseTo(0);
  });

  it("keeps destination when source alpha is 0", () => {
    const out = blendPremult(
      "normal",
      { r: 1, g: 0, b: 0, a: 0 },
      { r: 0, g: 0, b: 1, a: 1 },
    );
    expect(out.b).toBeCloseTo(1);
    expect(out.a).toBeCloseTo(1);
  });
});

describe("compositeLayers", () => {
  it("applies layer opacity on normal blend", () => {
    const bottom = rgbaBuffer(2, 2, [0, 0, 255, 255]);
    const top = rgbaBuffer(2, 2, [255, 0, 0, 255]);
    const out = compositeLayers(
      [
        { visible: true, opacity: 1, blendMode: "normal", pixels: bottom },
        { visible: true, opacity: 0.5, blendMode: "normal", pixels: top },
      ],
      2,
      2,
    );
    // src-over 50% red on blue → ~127.5 red contribution
    expect(out[0]).toBeGreaterThan(100);
    expect(out[0]).toBeLessThan(160);
    expect(out[2]).toBeGreaterThan(100);
    expect(out[3]).toBe(255);
  });

  it("skips invisible layers", () => {
    const bottom = rgbaBuffer(1, 1, [0, 255, 0, 255]);
    const top = rgbaBuffer(1, 1, [255, 0, 0, 255]);
    const out = compositeLayers(
      [
        { visible: true, opacity: 1, blendMode: "normal", pixels: bottom },
        { visible: false, opacity: 1, blendMode: "normal", pixels: top },
      ],
      1,
      1,
    );
    expect([...out.slice(0, 4)]).toEqual([0, 255, 0, 255]);
  });

  it("multiply darkens overlapping colours", () => {
    const bottom = rgbaBuffer(1, 1, [255, 255, 255, 255]);
    const top = rgbaBuffer(1, 1, [128, 128, 128, 255]);
    const out = compositeLayers(
      [
        { visible: true, opacity: 1, blendMode: "normal", pixels: bottom },
        { visible: true, opacity: 1, blendMode: "multiply", pixels: top },
      ],
      1,
      1,
    );
    expect(out[0]).toBeLessThan(200);
    expect(out[0]).toBeGreaterThan(100);
  });

  it("screen lightens", () => {
    const bottom = rgbaBuffer(1, 1, [0, 0, 0, 255]);
    const top = rgbaBuffer(1, 1, [128, 0, 0, 255]);
    const out = compositeLayers(
      [
        { visible: true, opacity: 1, blendMode: "normal", pixels: bottom },
        { visible: true, opacity: 1, blendMode: "screen", pixels: top },
      ],
      1,
      1,
    );
    expect(out[0]).toBeGreaterThan(100);
  });

  it("add clamps channel sum", () => {
    const bottom = rgbaBuffer(1, 1, [200, 0, 0, 255]);
    const top = rgbaBuffer(1, 1, [200, 0, 0, 255]);
    const out = compositeLayers(
      [
        { visible: true, opacity: 1, blendMode: "normal", pixels: bottom },
        { visible: true, opacity: 1, blendMode: "add", pixels: top },
      ],
      1,
      1,
    );
    expect(out[0]).toBe(255);
  });

  it("multiply over transparent backdrop keeps source colour", () => {
    const top = rgbaBuffer(1, 1, [255, 0, 0, 255]);
    const out = compositeLayers(
      [{ visible: true, opacity: 1, blendMode: "multiply", pixels: top }],
      1,
      1,
    );
    expect([...out.slice(0, 4)]).toEqual([255, 0, 0, 255]);
  });

  it("multiply red over black becomes black where they overlap", () => {
    const bottom = rgbaBuffer(1, 1, [0, 0, 0, 255]);
    const top = rgbaBuffer(1, 1, [255, 0, 0, 255]);
    const out = compositeLayers(
      [
        { visible: true, opacity: 1, blendMode: "normal", pixels: bottom },
        { visible: true, opacity: 1, blendMode: "multiply", pixels: top },
      ],
      1,
      1,
    );
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0);
    expect(out[2]).toBe(0);
    expect(out[3]).toBe(255);
  });
});
