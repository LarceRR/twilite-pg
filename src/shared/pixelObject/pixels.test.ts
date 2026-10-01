import { describe, expect, it } from "vitest";

import { hasOpaquePixel, packSheet, scaleNearest, sheetGrid } from "./pixels";

function solid(width: number, height: number, rgba: [number, number, number, number]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = rgba[0];
    pixels[index + 1] = rgba[1];
    pixels[index + 2] = rgba[2];
    pixels[index + 3] = rgba[3];
  }
  return pixels;
}

describe("scaleNearest", () => {
  it("expands one red pixel into a 2×2 block without blending", () => {
    const source = solid(1, 1, [255, 0, 0, 255]);
    const scaled = scaleNearest(source, 1, 1, 2);
    expect(scaled).toHaveLength(16);
    for (let index = 0; index < scaled.length; index += 4) {
      expect([scaled[index], scaled[index + 1], scaled[index + 2], scaled[index + 3]]).toEqual([
        255, 0, 0, 255,
      ]);
    }
  });

  it("keeps a transparent neighbour transparent", () => {
    const source = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]);
    const scaled = scaleNearest(source, 2, 1, 2);
    expect(scaled[7]).toBe(255);
    expect(scaled[(1 * 4 + 3) * 4 + 3]).toBe(0);
  });
});

describe("packSheet", () => {
  it("places the second frame on the next column and matches the grid", () => {
    const red = solid(2, 2, [255, 0, 0, 255]);
    const green = solid(2, 2, [0, 255, 0, 128]);
    const packed = packSheet([red, green], 2, 2);
    expect(sheetGrid(2)).toEqual({ columns: 2, rows: 1 });
    expect(packed.columns).toBe(2);
    expect(packed.rows).toBe(1);
    expect(packed.width).toBe(4);
    expect(packed.height).toBe(2);
    expect(packed.pixels[0]).toBe(255);
    expect(packed.pixels[2 * 4 + 1]).toBe(255);
    expect(packed.pixels[2 * 4 + 3]).toBe(128);
    expect(hasOpaquePixel(packed.pixels)).toBe(true);
  });

  it("treats a fully transparent buffer as empty", () => {
    expect(hasOpaquePixel(solid(2, 2, [0, 0, 0, 0]))).toBe(false);
  });
});
