import { describe, expect, it } from "vitest";
import { resolvePixelGrid } from "./pixelGrid";

function solid(width: number, height: number, rgba: [number, number, number, number]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = rgba[0];
    pixels[offset + 1] = rgba[1];
    pixels[offset + 2] = rgba[2];
    pixels[offset + 3] = rgba[3];
  }
  return pixels;
}

/** Nearest-neighbor enlarge. Each source pixel becomes a scale×scale cell. */
function upscale(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
): Uint8ClampedArray {
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (Math.floor(y / scale) * sourceWidth + Math.floor(x / scale)) * 4;
      const dst = (y * width + x) * 4;
      pixels[dst] = source[src]!;
      pixels[dst + 1] = source[src + 1]!;
      pixels[dst + 2] = source[src + 2]!;
      pixels[dst + 3] = source[src + 3]!;
    }
  }
  return pixels;
}

describe("resolvePixelGrid", () => {
  it("keeps a solid image at 1:1", () => {
    const pixels = solid(8, 8, [10, 20, 30, 255]);
    const grid = resolvePixelGrid(pixels, 8, 8);
    expect(grid.scale).toBe(1);
    expect(grid.width).toBe(8);
    expect(grid.height).toBe(8);
  });

  it("collapses a nearest-neighbor upscale to the logical grid", () => {
    const source = new Uint8ClampedArray(2 * 2 * 4);
    source.set([255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 255, 0, 0, 0, 255]);
    const pixels = upscale(source, 2, 2, 4);
    const grid = resolvePixelGrid(pixels, 8, 8);
    expect(grid).toMatchObject({ scale: 4, width: 2, height: 2 });
    expect(Array.from(grid.pixels)).toEqual(Array.from(source));
  });

  it("stays 1:1 when a cell is not a single color", () => {
    const pixels = upscale(solid(2, 2, [0, 0, 0, 255]), 2, 2, 4);
    pixels[0] = 1;
    const grid = resolvePixelGrid(pixels, 8, 8);
    expect(grid.scale).toBe(1);
    expect(grid.width).toBe(8);
  });
});
