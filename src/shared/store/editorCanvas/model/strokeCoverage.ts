import type { Rgba } from "./color";
import type { BrushShape } from "./brushShapes";
import { getBrushStampMask } from "./brushStamp";

/** Max-alpha stamp into a per-stroke coverage buffer (one byte per pixel). */
export function stampMaskIntoCoverage(
  coverage: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  mask: Uint8Array,
  size: number,
): boolean {
  const brushSize = Math.max(1, Math.floor(size));
  const half = Math.floor((brushSize - 1) / 2);
  const x0 = cx - half;
  const y0 = cy - half;
  let changed = false;

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
      const i = y * width + x;
      const prev = coverage[i]!;
      if (stampA > prev) {
        coverage[i] = stampA;
        changed = true;
      }
    }
  }

  return changed;
}

/** Straight-alpha source-over of colored coverage onto base → dest. */
export function compositeCoveragePaint(
  dest: Uint8ClampedArray,
  base: Uint8ClampedArray,
  coverage: Uint8Array,
  width: number,
  height: number,
  rgba: Rgba,
): void {
  const pixelCount = width * height;
  const sr = rgba[0];
  const sg = rgba[1];
  const sb = rgba[2];
  const saColor = rgba[3] / 255;

  for (let i = 0; i < pixelCount; i += 1) {
    const o = i * 4;
    const cov = coverage[i]!;
    if (cov <= 0) {
      dest[o] = base[o]!;
      dest[o + 1] = base[o + 1]!;
      dest[o + 2] = base[o + 2]!;
      dest[o + 3] = base[o + 3]!;
      continue;
    }

    const srcA = (cov / 255) * saColor;
    const dr = base[o]!;
    const dg = base[o + 1]!;
    const db = base[o + 2]!;
    const dstA = base[o + 3]! / 255;

    if (srcA <= 0) {
      dest[o] = dr;
      dest[o + 1] = dg;
      dest[o + 2] = db;
      dest[o + 3] = base[o + 3]!;
      continue;
    }

    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) {
      dest[o] = 0;
      dest[o + 1] = 0;
      dest[o + 2] = 0;
      dest[o + 3] = 0;
      continue;
    }

    dest[o] = Math.round((sr * srcA + dr * dstA * (1 - srcA)) / outA);
    dest[o + 1] = Math.round((sg * srcA + dg * dstA * (1 - srcA)) / outA);
    dest[o + 2] = Math.round((sb * srcA + db * dstA * (1 - srcA)) / outA);
    dest[o + 3] = Math.round(outA * 255);
  }
}

/** Soft eraser: destA' = baseA * (1 - coverageA); RGB cleared at a=0. */
export function compositeCoverageErase(
  dest: Uint8ClampedArray,
  base: Uint8ClampedArray,
  coverage: Uint8Array,
  width: number,
  height: number,
): void {
  const pixelCount = width * height;

  for (let i = 0; i < pixelCount; i += 1) {
    const o = i * 4;
    const cov = coverage[i]!;
    if (cov <= 0) {
      dest[o] = base[o]!;
      dest[o + 1] = base[o + 1]!;
      dest[o + 2] = base[o + 2]!;
      dest[o + 3] = base[o + 3]!;
      continue;
    }

    const stampA = cov / 255;
    const baseA = base[o + 3]!;
    const outA = Math.round(baseA * (1 - stampA));
    if (outA <= 0) {
      dest[o] = 0;
      dest[o + 1] = 0;
      dest[o + 2] = 0;
      dest[o + 3] = 0;
      continue;
    }

    dest[o] = base[o]!;
    dest[o + 1] = base[o + 1]!;
    dest[o + 2] = base[o + 2]!;
    dest[o + 3] = outA;
  }
}

export type StrokePaintMode = "paint" | "erase";

export type StrokeSession = {
  base: Uint8ClampedArray<ArrayBuffer>;
  coverage: Uint8Array;
  rgba: Rgba;
  mode: StrokePaintMode;
  shape: BrushShape;
  size: number;
  softness: number;
  mask: Uint8Array;
};

export function createStrokeSession(
  width: number,
  height: number,
  basePixels: Uint8ClampedArray,
  opts: {
    rgba: Rgba;
    mode: StrokePaintMode;
    shape: BrushShape;
    size: number;
    softness: number;
  },
): StrokeSession {
  const size = Math.max(1, Math.floor(opts.size));
  const softness = opts.size <= 1 ? 0 : Math.min(100, Math.max(0, Math.round(opts.softness)));
  const base = new Uint8ClampedArray(basePixels.length);
  base.set(basePixels);
  return {
    base,
    coverage: new Uint8Array(width * height),
    rgba: opts.rgba,
    mode: opts.mode,
    shape: opts.shape,
    size,
    softness,
    mask: getBrushStampMask(opts.shape, size, softness),
  };
}

export function applyStrokeSessionToLayer(
  layerPixels: Uint8ClampedArray,
  session: StrokeSession,
  width: number,
  height: number,
): void {
  if (session.mode === "erase") {
    compositeCoverageErase(layerPixels, session.base, session.coverage, width, height);
  } else {
    compositeCoveragePaint(
      layerPixels,
      session.base,
      session.coverage,
      width,
      height,
      session.rgba,
    );
  }
}

export function stampStrokeAt(
  session: StrokeSession,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return stampMaskIntoCoverage(
    session.coverage,
    width,
    height,
    x,
    y,
    session.mask,
    session.size,
  );
}
