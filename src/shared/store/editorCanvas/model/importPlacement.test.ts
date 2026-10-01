import { describe, expect, it } from "vitest";
import {
  collectOpaquePaletteHexes,
  estimateNativeSize,
  placeNativeGrid,
} from "./importPlacement";

function paint(buffer: Uint8ClampedArray, index: number, rgba: [number, number, number, number]): void {
  const offset = index * 4;
  buffer[offset] = rgba[0];
  buffer[offset + 1] = rgba[1];
  buffer[offset + 2] = rgba[2];
  buffer[offset + 3] = rgba[3];
}

function read(buffer: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const offset = (y * width + x) * 4;
  return [buffer[offset]!, buffer[offset + 1]!, buffer[offset + 2]!, buffer[offset + 3]!];
}

describe("estimateNativeSize", () => {
  it("forecasts floor(fitted / pixelSize) after the 400px fit", () => {
    expect(estimateNativeSize(800, 600, 8)).toEqual({ width: 50, height: 37 });
    expect(estimateNativeSize(400, 400, 2)).toEqual({ width: 200, height: 200 });
    expect(estimateNativeSize(400, 400, 3)).toEqual({ width: 133, height: 133 });
  });
});

describe("placeNativeGrid", () => {
  it("centers a 1:1 blit and letterboxes the rest", () => {
    const source = new Uint8ClampedArray(2 * 2 * 4);
    paint(source, 0, [255, 0, 0, 255]);

    const placed = placeNativeGrid(source, 2, 2, "center", 4, 4);

    expect(placed.cropped).toBe(false);
    expect(placed.letterboxed).toBe(true);
    expect(read(placed.pixels, 4, 1, 1)).toEqual([255, 0, 0, 255]);
    expect(read(placed.pixels, 4, 0, 0)).toEqual([0, 0, 0, 0]);
  });

  it("crops the center of a grid that is larger than the canvas", () => {
    const source = new Uint8ClampedArray(4 * 1 * 4);
    paint(source, 0, [10, 0, 0, 255]);
    paint(source, 1, [20, 0, 0, 255]);
    paint(source, 2, [30, 0, 0, 255]);
    paint(source, 3, [40, 0, 0, 255]);

    const placed = placeNativeGrid(source, 4, 1, "center", 2, 1);

    expect(placed.cropped).toBe(true);
    expect(placed.letterboxed).toBe(false);
    expect(read(placed.pixels, 2, 0, 0)[0]).toBe(20);
    expect(read(placed.pixels, 2, 1, 0)[0]).toBe(30);
  });

  it("places a 1:1 blit from the top-left", () => {
    const source = new Uint8ClampedArray(2 * 1 * 4);
    paint(source, 0, [9, 0, 0, 255]);
    paint(source, 1, [8, 0, 0, 255]);

    const placed = placeNativeGrid(source, 2, 1, "top-left", 4, 2);

    expect(read(placed.pixels, 4, 0, 0)).toEqual([9, 0, 0, 255]);
    expect(read(placed.pixels, 4, 1, 0)).toEqual([8, 0, 0, 255]);
    expect(read(placed.pixels, 4, 2, 0)[3]).toBe(0);
    expect(placed.letterboxed).toBe(true);
  });

  it("fits by nearest-neighbor shrink so the long edge stays inside the canvas", () => {
    const source = new Uint8ClampedArray(4 * 2 * 4);
    for (let index = 0; index < 8; index += 1) {
      paint(source, index, [index + 1, 0, 0, 255]);
    }

    const placed = placeNativeGrid(source, 4, 2, "fit", 2, 2);

    expect(placed.cropped).toBe(false);
    expect(placed.placedWidth).toBe(2);
    expect(placed.placedHeight).toBe(1);
    expect(read(placed.pixels, 2, 0, 0)[0]).toBeGreaterThan(0);
    expect(read(placed.pixels, 2, 0, 1)[3]).toBe(0);
  });

  it("stretches with nearest-neighbor to the exact canvas size", () => {
    const source = new Uint8ClampedArray(2 * 1 * 4);
    paint(source, 0, [1, 0, 0, 255]);
    paint(source, 1, [2, 0, 0, 255]);

    const placed = placeNativeGrid(source, 2, 1, "stretch", 2, 2);

    expect(placed.cropped).toBe(false);
    expect(placed.letterboxed).toBe(false);
    expect(read(placed.pixels, 2, 0, 0)).toEqual([1, 0, 0, 255]);
    expect(read(placed.pixels, 2, 1, 1)).toEqual([2, 0, 0, 255]);
  });
});

describe("collectOpaquePaletteHexes", () => {
  it("returns unique opaque colors and skips transparent pixels", () => {
    const pixels = new Uint8ClampedArray(3 * 4);
    paint(pixels, 0, [255, 0, 0, 255]);
    paint(pixels, 1, [0, 0, 0, 0]);
    paint(pixels, 2, [255, 0, 0, 255]);

    expect(collectOpaquePaletteHexes(pixels)).toEqual(["#ff0000"]);
  });
});
