import { describe, expect, it } from "vitest";
import { forEachBresenhamPoint, setPixel, stampBrush } from "./pixels";

describe("setPixel", () => {
  it("writes RGBA at the correct offset and ignores out-of-bounds", () => {
    const pixels = new Uint8ClampedArray(4 * 4);
    expect(setPixel(pixels, 2, 2, 1, 1, [10, 20, 30, 40])).toBe(true);
    expect([...pixels.slice(12, 16)]).toEqual([10, 20, 30, 40]);
    expect(setPixel(pixels, 2, 2, -1, 0, [1, 2, 3, 4])).toBe(false);
    expect(setPixel(pixels, 2, 2, 1, 1, [10, 20, 30, 40])).toBe(false);
  });
});

describe("stampBrush", () => {
  it("stamps a centered square brush", () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4);
    stampBrush(pixels, 5, 5, 2, 2, 3, [255, 0, 0, 255]);

    const filled: Array<[number, number]> = [];
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        if (pixels[(y * 5 + x) * 4 + 3] === 255) {
          filled.push([x, y]);
        }
      }
    }

    expect(filled).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
});

describe("forEachBresenhamPoint", () => {
  it("visits every cell on a diagonal without gaps", () => {
    const points: Array<[number, number]> = [];
    forEachBresenhamPoint(0, 0, 3, 3, (x, y) => points.push([x, y]));
    expect(points).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("covers a horizontal span", () => {
    const points: Array<[number, number]> = [];
    forEachBresenhamPoint(2, 1, 5, 1, (x, y) => points.push([x, y]));
    expect(points).toEqual([
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ]);
  });
});
