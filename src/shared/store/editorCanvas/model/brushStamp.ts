import type { BrushShape } from "./brushShapes";

const stampCache = new Map<string, Uint8Array>();
const STAMP_CACHE_VERSION = 3;
/** Samples per axis inside each cell so the feather is an area average, not one point. */
const FALLOFF_SAMPLES_PER_AXIS = 4;

function cacheKey(shape: BrushShape, size: number, softness: number): string {
  return `${STAMP_CACHE_VERSION}:${shape}:${size}:${softness}`;
}

/** Softness S ∈ [0..100] → hardness H ∈ [0..1]. */
export function softnessToHardness(softness: number): number {
  const s = Math.min(100, Math.max(0, softness));
  return 1 - s / 100;
}

/**
 * Convert normalized distance t and hardness into stamp alpha 0..255.
 * Size=1 always opaque (softness ignored).
 *
 * The feather is linear in t. A quadratic ramp collapses most of the edge
 * into a near-transparent fringe, so the brush looks smaller than its size
 * and the steps are uneven.
 */
export function falloffAlpha(t: number, hardness: number, softness: number): number {
  if (t >= 1) {
    return 0;
  }
  if (hardness >= 1 || softness <= 0) {
    return 255;
  }
  const hardRadius = hardness;
  if (t <= hardRadius) {
    return 255;
  }
  const denom = 1 - hardRadius;
  if (denom <= 0) {
    return 255;
  }
  const u = (t - hardRadius) / denom;
  if (u >= 1) {
    return 0;
  }
  return Math.round(255 * (1 - u));
}

function filledMetricDistance(shape: BrushShape, rdx: number, rdy: number): number {
  switch (shape) {
    case "square":
      return Math.max(Math.abs(rdx), Math.abs(rdy));
    case "circle":
      return Math.hypot(rdx, rdy);
    case "diamond":
      return Math.abs(rdx) + Math.abs(rdy);
  }
}

function continuousStampAlpha(
  shape: BrushShape,
  brushSize: number,
  softness: number,
  x: number,
  y: number,
): number {
  const center = (brushSize - 1) / 2;
  const distance = filledMetricDistance(shape, x - center, y - center);
  const radius = brushSize / 2;
  if (distance >= radius) {
    return 0;
  }
  return falloffAlpha(distance / radius, softnessToHardness(softness), softness);
}

/**
 * Alpha for one stamp cell. Local coords lx,ly ∈ [0, size).
 * Falloff uses the shape metric so soft squares stay square.
 * Soft cells are area-sampled so the ramp changes inside a pixel instead of
 * jumping between whole rings.
 */
export function stampCellAlpha(
  shape: BrushShape,
  size: number,
  softness: number,
  lx: number,
  ly: number,
): number {
  const brushSize = Math.max(1, Math.floor(size));
  if (brushSize <= 1) {
    return 255;
  }

  const s = Math.min(100, Math.max(0, softness));
  if (s <= 0) {
    const center = (brushSize - 1) / 2;
    const distance = filledMetricDistance(shape, lx - center, ly - center);
    const supportRadius = brushSize % 2 === 0 ? brushSize / 2 : (brushSize - 1) / 2;
    return distance > supportRadius ? 0 : 255;
  }

  const n = FALLOFF_SAMPLES_PER_AXIS;
  const step = 1 / n;
  const origin = step * 0.5 - 0.5;
  let sum = 0;
  for (let sy = 0; sy < n; sy += 1) {
    const y = ly + origin + sy * step;
    for (let sx = 0; sx < n; sx += 1) {
      const x = lx + origin + sx * step;
      sum += continuousStampAlpha(shape, brushSize, s, x, y);
    }
  }
  let alpha = Math.round(sum / (n * n));

  // The sample grid misses the exact center, which would dim the core pixel.
  const center = (brushSize - 1) / 2;
  if (Math.abs(lx - center) < 0.5 && Math.abs(ly - center) < 0.5) {
    alpha = Math.max(alpha, continuousStampAlpha(shape, brushSize, s, center, center));
  }

  return alpha;
}

/** Precompute size×size alpha mask; cached by shape/size/softness. */
export function getBrushStampMask(shape: BrushShape, size: number, softness: number): Uint8Array {
  const brushSize = Math.max(1, Math.floor(size));
  const soft = Math.min(100, Math.max(0, Math.round(softness)));
  const key = cacheKey(shape, brushSize, soft);
  const cached = stampCache.get(key);
  if (cached) {
    return cached;
  }

  const mask = new Uint8Array(brushSize * brushSize);
  for (let ly = 0; ly < brushSize; ly += 1) {
    for (let lx = 0; lx < brushSize; lx += 1) {
      mask[ly * brushSize + lx] = stampCellAlpha(shape, brushSize, soft, lx, ly);
    }
  }
  stampCache.set(key, mask);
  return mask;
}

/** Test helper — drop LUT entries. */
export function __clearBrushStampCacheForTests(): void {
  stampCache.clear();
}
