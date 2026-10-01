import { describe, expect, it } from "vitest";
import { floodFill, samePixel } from "./floodFill";
import type { Rgba } from "./color";

const T: Rgba = [0, 0, 0, 0];
const RED: Rgba = [255, 0, 0, 255];
const BLUE: Rgba = [0, 0, 255, 255];
const GREEN: Rgba = [0, 255, 0, 255];

function grid(rows: string[]): Uint8ClampedArray<ArrayBuffer> {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const paint = (x: number, y: number, rgba: Rgba) => {
    const offset = (y * width + x) * 4;
    pixels[offset] = rgba[0];
    pixels[offset + 1] = rgba[1];
    pixels[offset + 2] = rgba[2];
    pixels[offset + 3] = rgba[3];
  };

  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "R") paint(x, y, RED);
      if (cell === "B") paint(x, y, BLUE);
      if (cell === "G") paint(x, y, GREEN);
    });
  });

  return pixels;
}

function cell(pixels: Uint8ClampedArray, width: number, x: number, y: number): Rgba {
  const offset = (y * width + x) * 4;
  return [pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!, pixels[offset + 3]!];
}

describe("samePixel", () => {
  it("treats fully transparent pixels as equal", () => {
    expect(samePixel([0, 0, 0, 0], [255, 0, 0, 0])).toBe(true);
  });

  it("requires exact RGBA at zero tolerance", () => {
    expect(samePixel(RED, RED)).toBe(true);
    expect(samePixel(RED, BLUE)).toBe(false);
    expect(samePixel([255, 0, 0, 254], RED, 1)).toBe(true);
  });
});

describe("floodFill", () => {
  it("fills an open region and a single pixel", () => {
    const open = grid(["...", "...", "..."]);
    expect(floodFill(open, 3, 3, 0, 0, RED)).toBe(9);
    expect(cell(open, 3, 2, 2)).toEqual(RED);

    const single = grid([".R."]);
    expect(floodFill(single, 3, 1, 1, 0, BLUE)).toBe(1);
    expect(cell(single, 3, 0, 0)).toEqual(T);
    expect(cell(single, 3, 1, 0)).toEqual(BLUE);
  });

  it("fills inside a closed ring and leaves the outside empty", () => {
    const pixels = grid([".....", ".RRR.", ".R.R.", ".RRR.", "....."]);
    expect(floodFill(pixels, 5, 5, 2, 2, BLUE)).toBe(1);
    expect(cell(pixels, 5, 2, 2)).toEqual(BLUE);
    expect(cell(pixels, 5, 1, 1)).toEqual(RED);
    expect(cell(pixels, 5, 0, 0)).toEqual(T);
  });

  it("does not leak through a diagonal gap with 4-way connectivity", () => {
    const pixels = grid(["..R", ".R.", "R.."]);
    expect(floodFill(pixels, 3, 3, 0, 0, BLUE)).toBe(3);
    expect(cell(pixels, 3, 2, 2)).toEqual(T);
    expect(cell(pixels, 3, 1, 1)).toEqual(RED);
  });

  it("fills a contiguous transparent region and stops at opaque pixels", () => {
    const pixels = grid(["..R", "..R", "..R"]);
    expect(floodFill(pixels, 3, 3, 0, 1, GREEN)).toBe(6);
    expect(cell(pixels, 3, 1, 2)).toEqual(GREEN);
    expect(cell(pixels, 3, 2, 0)).toEqual(RED);
  });

  it("no-ops when the seed already matches, including transparent fill", () => {
    const pixels = grid(["R"]);
    expect(floodFill(pixels, 1, 1, 0, 0, RED)).toBe(0);
    expect(floodFill(pixels, 1, 1, -1, 0, BLUE)).toBe(0);

    const empty = grid(["."]);
    expect(floodFill(empty, 1, 1, 0, 0, T)).toBe(0);
  });
});
