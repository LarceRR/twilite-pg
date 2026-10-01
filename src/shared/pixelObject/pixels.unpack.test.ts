import { describe, expect, it } from "vitest";

import { packSheet, unpackSheet } from "./pixels";

describe("unpackSheet", () => {
  it("round-trips row-major packed frames", () => {
    const frameA = new Uint8ClampedArray(2 * 2 * 4);
    frameA[0] = 11;
    frameA[3] = 255;
    const frameB = new Uint8ClampedArray(2 * 2 * 4);
    frameB[4] = 22;
    frameB[7] = 255;
    const packed = packSheet([frameA, frameB], 2, 2);
    const frames = unpackSheet({
      pixels: packed.pixels,
      sheetWidth: packed.width,
      sheetHeight: packed.height,
      frameWidth: 2,
      frameHeight: 2,
      columns: packed.columns,
      frameCount: 2,
    });
    expect(frames).toHaveLength(2);
    expect(frames[0]?.[0]).toBe(11);
    expect(frames[1]?.[4]).toBe(22);
  });
});
