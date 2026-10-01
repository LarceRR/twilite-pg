import type { BrushShape } from "./brushShapes";

const stampCache = new Map<string, Uint8Array>();
const STAMP_CACHE_VERSION = 2;

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
 */
export function falloffAlpha(t: number, hardness: number, softness: number): number {
  if (t > 1) {
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
  return Math.round(255 * (1 - u) * (1 - u));
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

/**
 * Alpha for one stamp cell. Local coords lx,ly ∈ [0, size).
 * Falloff uses the shape metric so soft squares stay square.
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

  const center = (brushSize - 1) / 2;
  const rdx = lx - center;
  const rdy = ly - center;
  const distance = filledMetricDistance(shape, rdx, rdy);
  const supportRadius = brushSize % 2 === 0 ? brushSize / 2 : (brushSize - 1) / 2;
  if (distance > supportRadius) {
    return 0;
  }

  // Sample at cell centers against the geometric (size / 2) radius. Using
  // (size - 1) / 2 puts every outer cell at t=1, where any softness makes it
  // fully transparent and shrinks a size-N brush by two pixels.
  const t = distance / (brushSize / 2);
  const H = softnessToHardness(softness);
  const s = Math.min(100, Math.max(0, softness));

  return falloffAlpha(t, H, s);
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
