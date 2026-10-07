import { getBrushStampMask, markFloodRegion, type BrushShape } from "@/shared/store/editorCanvas";

/** Above this, the highlight is an outline only so a full-canvas fill stays cheap. */
const FILL_RECT_LIMIT = 16_384;

export type AffectMode =
  | { type: "stamp"; shape: BrushShape; size: number; softness: number }
  | { type: "fill" }
  | { type: "pixel" };

export function affectModeForTool(
  toolName: string,
  brushShape: BrushShape,
  size: number,
  softness: number,
): AffectMode {
  const safeSize = Math.max(1, Math.floor(size));
  const safeSoft = Math.min(100, Math.max(0, Math.round(softness)));
  switch (toolName) {
    case "Pen":
      return { type: "stamp", shape: "square", size: 1, softness: 0 };
    case "Shapes":
      return { type: "stamp", shape: "circle", size: safeSize, softness: safeSoft };
    case "Brush":
    case "Eraser":
      return { type: "stamp", shape: brushShape, size: safeSize, softness: safeSoft };
    case "Fill":
      return { type: "fill" };
    default:
      return { type: "pixel" };
  }
}

export type AffectZoneBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/**
 * Pixels a click at (x, y) would change. Stamp tools use the same origin as
 * painting: `half = floor((size - 1) / 2)`. Paint tools are clipped to the
 * selection mask when one is active.
 */
export function paintToolAffectZone(
  mask: Uint8Array,
  opts: {
    mode: AffectMode;
    x: number;
    y: number;
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
    selectionMask: Uint8Array | null;
  },
): number {
  const { width, height } = opts;
  const count = width * height;
  mask.fill(0, 0, count);

  if (opts.mode.type === "fill") {
    const filled = markFloodRegion(opts.pixels, mask, width, height, opts.x, opts.y);
    return clipMaskToSelection(mask, opts.selectionMask, filled);
  }

  if (opts.mode.type === "pixel") {
    return paintCell(mask, width, height, opts.x, opts.y, null) ? 1 : 0;
  }

  const { shape, size, softness } = opts.mode;
  const stamp = getBrushStampMask(shape, size, softness);
  const half = Math.floor((size - 1) / 2);
  const x0 = opts.x - half;
  const y0 = opts.y - half;
  let painted = 0;

  for (let ly = 0; ly < size; ly += 1) {
    for (let lx = 0; lx < size; lx += 1) {
      if (stamp[ly * size + lx]! <= 0) {
        continue;
      }
      if (paintCell(mask, width, height, x0 + lx, y0 + ly, opts.selectionMask)) {
        painted += 1;
      }
    }
  }

  return painted;
}

function paintCell(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  selectionMask: Uint8Array | null,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false;
  }
  const index = y * width + x;
  if (selectionMask && selectionMask[index] === 0) {
    return false;
  }
  if (mask[index] === 1) {
    return false;
  }
  mask[index] = 1;
  return true;
}

function clipMaskToSelection(
  mask: Uint8Array,
  selectionMask: Uint8Array | null,
  count: number,
): number {
  if (!selectionMask) {
    return count;
  }
  let next = count;
  const n = Math.min(mask.length, selectionMask.length);
  for (let i = 0; i < n; i += 1) {
    if (mask[i] && selectionMask[i] === 0) {
      mask[i] = 0;
      next -= 1;
    }
  }
  return next;
}

export function affectZoneBounds(
  mask: Uint8Array,
  width: number,
  height: number,
): AffectZoneBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (!mask[row + x]) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

export function affectZonePaths(
  mask: Uint8Array,
  width: number,
  height: number,
  zoom: number,
  cellCount: number,
): { outline: string; fill: string } {
  const outline: string[] = [];
  const fill: string[] = [];
  const drawFill = cellCount > 0 && cellCount <= FILL_RECT_LIMIT;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) {
        continue;
      }
      const x0 = x * zoom;
      const y0 = y * zoom;
      const x1 = x0 + zoom;
      const y1 = y0 + zoom;
      if (drawFill) {
        fill.push(`M${x0} ${y0}h${zoom}v${zoom}h${-zoom}z`);
      }
      const left = x === 0 || !mask[y * width + (x - 1)];
      const right = x === width - 1 || !mask[y * width + (x + 1)];
      const top = y === 0 || !mask[(y - 1) * width + x];
      const bottom = y === height - 1 || !mask[(y + 1) * width + x];
      if (top) outline.push(`M${x0} ${y0}L${x1} ${y0}`);
      if (bottom) outline.push(`M${x0} ${y1}L${x1} ${y1}`);
      if (left) outline.push(`M${x0} ${y0}L${x0} ${y1}`);
      if (right) outline.push(`M${x1} ${y0}L${x1} ${y1}`);
    }
  }

  return { outline: outline.join(""), fill: fill.join("") };
}
