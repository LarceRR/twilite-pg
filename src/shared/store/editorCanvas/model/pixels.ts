import type { Rgba } from "./color";
import type { BrushShape } from "./brushShapes";
import { DEFAULT_BRUSH_SHAPE } from "./brushShapes";
import { getBrushStampMask } from "./brushStamp";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { stampMaskIntoCoverage } from "./strokeCoverage";

export function createEmptyPixels(
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): Uint8ClampedArray<ArrayBuffer> {
  return new Uint8ClampedArray(width * height * 4);
}

export function clonePixels(
  pixels: Uint8ClampedArray,
): Uint8ClampedArray<ArrayBuffer> {
  const copy = new Uint8ClampedArray(pixels.length);
  copy.set(pixels);
  return copy;
}

export function setPixel(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  rgba: Rgba,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false;
  }

  const offset = (y * width + x) * 4;
  if (
    pixels[offset] === rgba[0] &&
    pixels[offset + 1] === rgba[1] &&
    pixels[offset + 2] === rgba[2] &&
    pixels[offset + 3] === rgba[3]
  ) {
    return false;
  }

  pixels[offset] = rgba[0];
  pixels[offset + 1] = rgba[1];
  pixels[offset + 2] = rgba[2];
  pixels[offset + 3] = rgba[3];
  return true;
}

export type StampBrushOptions = {
  shape?: BrushShape;
  softness?: number;
};

/**
 * Stamp brush with optional shape/softness (source-over for soft alpha).
 * Softness 0 + square matches the legacy hard opaque square.
 */
export function stampBrush(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  size: number,
  rgba: Rgba,
  options: StampBrushOptions = {},
): boolean {
  const shape = options.shape ?? DEFAULT_BRUSH_SHAPE;
  const softness = options.softness ?? 0;
  const brushSize = Math.max(1, Math.floor(size));
  const mask = getBrushStampMask(shape, brushSize, softness);
  const half = Math.floor((brushSize - 1) / 2);
  const x0 = cx - half;
  const y0 = cy - half;
  let changed = false;

  const sr = rgba[0];
  const sg = rgba[1];
  const sb = rgba[2];
  const saColor = rgba[3] / 255;

  for (let ly = 0; ly < brushSize; ly += 1) {
    for (let lx = 0; lx < brushSize; lx += 1) {
      const stampA = mask[ly * brushSize + lx]!;
      if (stampA <= 0) {
        continue;
      }
      const x = x0 + lx;
      const y = y0 + ly;
      if (x < 0 || y < 0 || x >= width || y >= height) {
        continue;
      }

      const o = (y * width + x) * 4;
      const srcA = (stampA / 255) * saColor;

      // Fully opaque replace (legacy hard brush path).
      if (srcA >= 1 - 1e-6) {
        if (
          pixels[o] !== sr ||
          pixels[o + 1] !== sg ||
          pixels[o + 2] !== sb ||
          pixels[o + 3] !== 255
        ) {
          pixels[o] = sr;
          pixels[o + 1] = sg;
          pixels[o + 2] = sb;
          pixels[o + 3] = 255;
          changed = true;
        }
        continue;
      }

      if (srcA <= 0) {
        continue;
      }

      const dr = pixels[o]!;
      const dg = pixels[o + 1]!;
      const db = pixels[o + 2]!;
      const dstA = pixels[o + 3]! / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA <= 0) {
        if (pixels[o + 3] !== 0) {
          pixels[o] = 0;
          pixels[o + 1] = 0;
          pixels[o + 2] = 0;
          pixels[o + 3] = 0;
          changed = true;
        }
        continue;
      }

      const nr = Math.round((sr * srcA + dr * dstA * (1 - srcA)) / outA);
      const ng = Math.round((sg * srcA + dg * dstA * (1 - srcA)) / outA);
      const nb = Math.round((sb * srcA + db * dstA * (1 - srcA)) / outA);
      const na = Math.round(outA * 255);
      if (
        pixels[o] !== nr ||
        pixels[o + 1] !== ng ||
        pixels[o + 2] !== nb ||
        pixels[o + 3] !== na
      ) {
        pixels[o] = nr;
        pixels[o + 1] = ng;
        pixels[o + 2] = nb;
        pixels[o + 3] = na;
        changed = true;
      }
    }
  }

  return changed;
}

/** Integer Bresenham line; calls `plot` for every cell including endpoints. */
export function forEachBresenhamPoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  plot: (x: number, y: number) => void,
): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  for (;;) {
    plot(x, y);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

export function drawStrokeSegment(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  rgba: Rgba,
  options: StampBrushOptions = {},
): boolean {
  let changed = false;
  forEachBresenhamPoint(x0, y0, x1, y1, (x, y) => {
    if (stampBrush(pixels, width, height, x, y, size, rgba, options)) {
      changed = true;
    }
  });
  return changed;
}

/** Stamp along Bresenham into a coverage buffer (max alpha). */
export function stampSegmentIntoCoverage(
  coverage: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mask: Uint8Array,
  size: number,
): boolean {
  let changed = false;
  forEachBresenhamPoint(x0, y0, x1, y1, (x, y) => {
    if (stampMaskIntoCoverage(coverage, width, height, x, y, mask, size)) {
      changed = true;
    }
  });
  return changed;
}

export function assertPixelBuffer(pixels: Uint8ClampedArray, width: number, height: number): void {
  const expected = width * height * 4;
  if (pixels.length !== expected) {
    throw new Error(`Expected pixel buffer of ${expected} bytes, got ${pixels.length}`);
  }
}
