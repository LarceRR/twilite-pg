import { describe, expect, it } from "vitest";
import { createEmptyPixels } from "@/shared/store/editorCanvas";
import {
  affectModeForTool,
  affectZoneBounds,
  affectZonePaths,
  paintToolAffectZone,
} from "./toolAffectZone";

function cells(mask: Uint8Array, width: number): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  mask.forEach((value, index) => {
    if (value) {
      found.push([index % width, Math.floor(index / width)]);
    }
  });
  return found;
}

describe("tool affect zone", () => {
  it("maps each tool onto the pixels a click would use", () => {
    expect(affectModeForTool("Pen", "circle", 8, 40)).toEqual({
      type: "stamp",
      shape: "square",
      size: 1,
      softness: 0,
    });
    expect(affectModeForTool("Shapes", "square", 3.8, 12)).toEqual({
      type: "stamp",
      shape: "circle",
      size: 3,
      softness: 12,
    });
    expect(affectModeForTool("Brush", "diamond", 4, 0).type).toBe("stamp");
    expect(affectModeForTool("Eraser", "circle", 4, 10).type).toBe("stamp");
    expect(affectModeForTool("Fill", "square", 1, 0)).toEqual({ type: "fill" });
    expect(affectModeForTool("Select", "square", 1, 0)).toEqual({ type: "pixel" });
    expect(affectModeForTool("Crop", "square", 1, 0)).toEqual({ type: "pixel" });
  });

  it("places a size-4 circle on the same 4px footprint as the stamp", () => {
    const width = 12;
    const height = 12;
    const mask = new Uint8Array(width * height);
    const count = paintToolAffectZone(mask, {
      mode: { type: "stamp", shape: "circle", size: 4, softness: 0 },
      x: 6,
      y: 6,
      width,
      height,
      pixels: createEmptyPixels(width, height),
      selectionMask: null,
    });

    expect(count).toBe(12);
    expect(affectZoneBounds(mask, width, height)).toEqual({
      minX: 5,
      minY: 5,
      maxX: 8,
      maxY: 8,
    });
    expect(cells(mask, width)).not.toContainEqual([5, 5]);
    expect(cells(mask, width)).toContainEqual([6, 5]);
    expect(cells(mask, width)).toContainEqual([6, 6]);
  });

  it("keeps a hard size-3 circle as a plus and clips it to the selection", () => {
    const width = 9;
    const height = 9;
    const mask = new Uint8Array(width * height);
    const selection = new Uint8Array(width * height);
    selection[4 * width + 4] = 1;
    selection[3 * width + 4] = 1;

    const count = paintToolAffectZone(mask, {
      mode: { type: "stamp", shape: "circle", size: 3, softness: 0 },
      x: 4,
      y: 4,
      width,
      height,
      pixels: createEmptyPixels(width, height),
      selectionMask: selection,
    });

    expect(count).toBe(2);
    expect(cells(mask, width)).toEqual([
      [4, 3],
      [4, 4],
    ]);
  });

  it("drops stamp pixels that fall outside the canvas", () => {
    const width = 3;
    const height = 3;
    const mask = new Uint8Array(width * height);
    const count = paintToolAffectZone(mask, {
      mode: { type: "stamp", shape: "square", size: 3, softness: 0 },
      x: 0,
      y: 0,
      width,
      height,
      pixels: createEmptyPixels(width, height),
      selectionMask: null,
    });

    expect(count).toBe(4);
    expect(affectZoneBounds(mask, width, height)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1,
    });
  });

  it("marks the fill region and outlines one pixel without an interior edge", () => {
    const width = 3;
    const height = 1;
    const pixels = createEmptyPixels(width, height);
    const opaque = 2 * 4;
    pixels[opaque] = 255;
    pixels[opaque + 1] = 0;
    pixels[opaque + 2] = 0;
    pixels[opaque + 3] = 255;
    const mask = new Uint8Array(width * height);
    const count = paintToolAffectZone(mask, {
      mode: { type: "fill" },
      x: 0,
      y: 0,
      width,
      height,
      pixels,
      selectionMask: null,
    });

    expect(count).toBe(2);
    expect(cells(mask, width)).toEqual([
      [0, 0],
      [1, 0],
    ]);

    const single = new Uint8Array(1);
    single[0] = 1;
    expect(affectZonePaths(single, 1, 1, 2, 1)).toEqual({
      outline: "M0 0L2 0M0 2L2 2M0 0L0 2M2 0L2 2",
      fill: "M0 0h2v2h-2z",
    });
  });
});
