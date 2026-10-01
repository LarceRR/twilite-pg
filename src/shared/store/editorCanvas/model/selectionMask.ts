import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import type { SelectionOpMode } from "./selection";

export type MaskBBox = { x: number; y: number; w: number; h: number };

export type PixelPoint = { x: number; y: number };

export function createEmptyMask(
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): Uint8Array {
  return new Uint8Array(width * height);
}

export function cloneMask(mask: Uint8Array): Uint8Array {
  return new Uint8Array(mask);
}

/** Returns true if every byte is 0 (or mask is null). */
export function maskIsEmpty(mask: Uint8Array | null | undefined): boolean {
  if (!mask) return true;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]! !== 0) return false;
  }
  return true;
}

/** Null-out empty masks so Idle never keeps a zero buffer. */
export function normalizeMask(mask: Uint8Array | null): Uint8Array | null {
  if (!mask || maskIsEmpty(mask)) return null;
  return mask;
}

export function maskBBox(
  mask: Uint8Array,
  width: number,
  height: number,
): MaskBBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[row + x]! !== 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function maskHitTest(
  mask: Uint8Array | null,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  if (!mask) return false;
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return mask[y * width + x]! !== 0;
}

/** Inclusive integer rect, clipped to canvas. Returns whether any pixel was set. */
export function fillRect(
  mask: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(width - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(height - 1, Math.max(y0, y1));
  if (minX > maxX || minY > maxY) return false;

  for (let y = minY; y <= maxY; y++) {
    const row = y * width;
    for (let x = minX; x <= maxX; x++) {
      mask[row + x] = 1;
    }
  }
  return true;
}

/**
 * Analytical ellipse fill: pixel center (px+0.5, py+0.5) inside unit ellipse of bbox.
 * Spec: docs/editor/selection/03-elliptical-marquee.md
 */
export function fillEllipse(
  mask: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  if (bw < 1 || bh < 1) return false;

  // Inclusive pixel bbox edges are [min, max+1]; center of that continuum keeps L/R symmetry.
  const cx = (minX + maxX + 1) / 2;
  const cy = (minY + maxY + 1) / 2;
  const rx = bw / 2;
  const ry = bh / 2;

  // Zero-area axis (should not happen after normalize) — fill inclusive bbox.
  if (rx <= 0 || ry <= 0) {
    return fillRect(mask, width, height, minX, minY, maxX, maxY);
  }

  const clipMinX = Math.max(0, minX);
  const clipMaxX = Math.min(width - 1, maxX);
  const clipMinY = Math.max(0, minY);
  const clipMaxY = Math.min(height - 1, maxY);
  if (clipMinX > clipMaxX || clipMinY > clipMaxY) return false;

  let any = false;
  const invRx2 = 1 / (rx * rx);
  const invRy2 = 1 / (ry * ry);

  for (let py = clipMinY; py <= clipMaxY; py++) {
    const row = py * width;
    const ny = py + 0.5 - cy;
    const yTerm = ny * ny * invRy2;
    for (let px = clipMinX; px <= clipMaxX; px++) {
      const nx = px + 0.5 - cx;
      if (nx * nx * invRx2 + yTerm <= 1) {
        mask[row + px] = 1;
        any = true;
      }
    }
  }
  return any;
}

/**
 * Even-odd fill of a closed polygon (auto-close last→first).
 * Each pixel center (x+0.5, y+0.5) is tested with ray casting.
 * Points may lie outside the canvas; fill is clipped.
 */
export function fillLassoPolygon(
  mask: Uint8Array,
  width: number,
  height: number,
  points: readonly PixelPoint[],
): boolean {
  if (points.length < 3) return false;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const xStart = Math.max(0, Math.floor(minX));
  const yStart = Math.max(0, Math.floor(minY));
  const xEnd = Math.min(width - 1, Math.ceil(maxX));
  const yEnd = Math.min(height - 1, Math.ceil(maxY));
  if (xStart > xEnd || yStart > yEnd) return false;

  const n = points.length;
  let any = false;

  // Ensure path pixels themselves are selected (integer document points).
  for (const p of points) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    if (px < 0 || py < 0 || px >= width || py >= height) continue;
    mask[py * width + px] = 1;
    any = true;
  }

  for (let y = yStart; y <= yEnd; y++) {
    const py = y + 0.5;
    const row = y * width;
    for (let x = xStart; x <= xEnd; x++) {
      const px = x + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const yi = points[i]!.y;
        const yj = points[j]!.y;
        const xi = points[i]!.x;
        const xj = points[j]!.x;
        const intersect =
          yi > py !== yj > py &&
          px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      if (inside) {
        mask[row + x] = 1;
        any = true;
      }
    }
  }

  return any;
}

export function applyBoolean(
  base: Uint8Array | null,
  next: Uint8Array,
  mode: SelectionOpMode,
): Uint8Array | null {
  if (mode === "replace") {
    return normalizeMask(cloneMask(next));
  }

  if (mode === "add") {
    if (!base) return normalizeMask(cloneMask(next));
    const out = cloneMask(base);
    for (let i = 0; i < out.length; i++) {
      if (next[i]! !== 0) out[i] = 1;
    }
    return normalizeMask(out);
  }

  // subtract
  if (!base) return null;
  const out = cloneMask(base);
  for (let i = 0; i < out.length; i++) {
    if (next[i]! !== 0) out[i] = 0;
  }
  return normalizeMask(out);
}

/** Normalize inclusive bbox corners; optionally force square from (x0,y0) anchor. */
export function normalizeDraftRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  constrainSquare: boolean,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let dx = x1 - x0;
  let dy = y1 - y0;

  if (constrainSquare) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * side;
    dy = Math.sign(dy || 1) * side;
    // Preserve zero when both zero (1×1 at origin).
    if (x1 === x0 && y1 === y0) {
      dx = 0;
      dy = 0;
    } else if (x1 === x0) {
      dx = Math.sign(dy || 1) * Math.abs(dy);
    } else if (y1 === y0) {
      dy = Math.sign(dx || 1) * Math.abs(dx);
    }
  }

  const ax1 = x0 + dx;
  const ay1 = y0 + dy;
  return {
    minX: Math.min(x0, ax1),
    minY: Math.min(y0, ay1),
    maxX: Math.max(x0, ax1),
    maxY: Math.max(y0, ay1),
  };
}

/** Build a temp canvas-sized mask from a draft shape. */
export function rasterizeDraftShape(
  kind: "rect" | "ellipse" | "lasso",
  args: {
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
    constrain?: boolean;
    points?: readonly PixelPoint[];
  },
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): Uint8Array | null {
  const mask = createEmptyMask(width, height);

  if (kind === "lasso") {
    const points = args.points ?? [];
    if (!fillLassoPolygon(mask, width, height, points)) return null;
    return mask;
  }

  const x0 = args.x0 ?? 0;
  const y0 = args.y0 ?? 0;
  const x1 = args.x1 ?? x0;
  const y1 = args.y1 ?? y0;
  const { minX, minY, maxX, maxY } = normalizeDraftRect(
    x0,
    y0,
    x1,
    y1,
    Boolean(args.constrain),
  );

  const ok =
    kind === "rect"
      ? fillRect(mask, width, height, minX, minY, maxX, maxY)
      : fillEllipse(mask, width, height, minX, minY, maxX, maxY);

  return ok ? mask : null;
}

export function createFullMask(
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): Uint8Array {
  const mask = createEmptyMask(width, height);
  mask.fill(1);
  return mask;
}
