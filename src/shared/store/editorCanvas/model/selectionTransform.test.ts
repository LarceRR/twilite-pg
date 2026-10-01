import { describe, expect, it } from "vitest";
import { createEmptyPixels } from "./pixels";
import { createEmptyMask, fillRect } from "./selectionMask";
import {
  clearUnderMask,
  extractUnderMask,
  identityTransformFromExtract,
  sampleFloatToCanvas,
  snapRotationDegrees,
  stampFloatOntoLayer,
} from "./selectionTransform";
import { computePasteOrigin } from "./selectionClipboard";

function paint(
  pixels: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  rgba: [number, number, number, number],
) {
  const o = (y * w + x) * 4;
  pixels[o] = rgba[0];
  pixels[o + 1] = rgba[1];
  pixels[o + 2] = rgba[2];
  pixels[o + 3] = rgba[3];
}

function read(
  pixels: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const o = (y * w + x) * 4;
  return [pixels[o]!, pixels[o + 1]!, pixels[o + 2]!, pixels[o + 3]!];
}

describe("extract / clear / stamp", () => {
  it("extracts under mask, clears hole, stamps translate", () => {
    const layer = createEmptyPixels(4, 4);
    paint(layer, 4, 1, 1, [255, 0, 0, 255]);
    paint(layer, 4, 2, 1, [0, 255, 0, 255]);

    const mask = createEmptyMask(4, 4);
    fillRect(mask, 4, 4, 1, 1, 2, 1);

    const extract = extractUnderMask(layer, 4, 4, mask)!;
    expect(extract.width).toBe(2);
    expect(extract.height).toBe(1);
    expect(extract.originX).toBe(1);
    expect(read(extract.pixels, 2, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(read(extract.pixels, 2, 1, 0)).toEqual([0, 255, 0, 255]);

    clearUnderMask(layer, 4, 4, mask);
    expect(read(layer, 4, 1, 1)).toEqual([0, 0, 0, 0]);
    expect(read(layer, 4, 2, 1)).toEqual([0, 0, 0, 0]);

    const transform = identityTransformFromExtract(extract);
    transform.x += 1;
    transform.y += 1;
    const sampled = sampleFloatToCanvas(
      extract.pixels,
      extract.mask,
      extract.width,
      extract.height,
      transform,
      4,
      4,
    );
    stampFloatOntoLayer(layer, sampled.pixels, sampled.mask, 4, 4);
    expect(read(layer, 4, 2, 2)).toEqual([255, 0, 0, 255]);
    expect(read(layer, 4, 3, 2)).toEqual([0, 255, 0, 255]);
  });

  it("rotates 90° with nearest-neighbor and snaps angles", () => {
    expect(snapRotationDegrees(22, true)).toBe(15);
    expect(snapRotationDegrees(23, true)).toBe(30);
    expect(snapRotationDegrees(22, false)).toBe(22);

    const layer = createEmptyPixels(5, 5);
    paint(layer, 5, 2, 1, [10, 20, 30, 255]);
    const mask = createEmptyMask(5, 5);
    fillRect(mask, 5, 5, 2, 1, 2, 1);
    const extract = extractUnderMask(layer, 5, 5, mask)!;
    const transform = identityTransformFromExtract(extract);
    transform.rotation = 90;
    // Keep center; after 90° the single pixel stays near center of 1×1.
    const sampled = sampleFloatToCanvas(
      extract.pixels,
      extract.mask,
      extract.width,
      extract.height,
      transform,
      5,
      5,
    );
    expect(sampled.stampBBox).not.toBeNull();
  });
});

describe("computePasteOrigin", () => {
  it("centers first paste and offsets spam pastes", () => {
    expect(computePasteOrigin(2, 2, 10, 10, null, false)).toEqual({
      x: 4,
      y: 4,
    });
    expect(
      computePasteOrigin(2, 2, 10, 10, { x: 4, y: 4 }, true),
    ).toEqual({ x: 5, y: 5 });
  });
});
