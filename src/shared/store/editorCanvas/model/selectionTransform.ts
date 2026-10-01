import { clonePixels, createEmptyPixels } from "./pixels";
import type { FloatTransform } from "./selection";
import { cloneMask, createEmptyMask, maskBBox, type MaskBBox } from "./selectionMask";

export type ExtractedSelection = {
  pixels: Uint8ClampedArray;
  mask: Uint8Array;
  width: number;
  height: number;
  originX: number;
  originY: number;
};

/**
 * Extract RGBA + local mask under document mask into a tight bbox buffer.
 * Does not mutate the layer.
 */
export function extractUnderMask(
  layerPixels: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  selectionMask: Uint8Array,
): ExtractedSelection | null {
  const bbox = maskBBox(selectionMask, canvasWidth, canvasHeight);
  if (!bbox) return null;

  const { x: ox, y: oy, w, h } = bbox;
  const pixels = new Uint8ClampedArray(w * h * 4);
  const mask = createEmptyMask(w, h);

  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      const dx = ox + lx;
      const dy = oy + ly;
      const srcIdx = dy * canvasWidth + dx;
      if (selectionMask[srcIdx]! === 0) continue;
      mask[ly * w + lx] = 1;
      const srcOff = srcIdx * 4;
      const dstOff = (ly * w + lx) * 4;
      pixels[dstOff] = layerPixels[srcOff]!;
      pixels[dstOff + 1] = layerPixels[srcOff + 1]!;
      pixels[dstOff + 2] = layerPixels[srcOff + 2]!;
      pixels[dstOff + 3] = layerPixels[srcOff + 3]!;
    }
  }

  return { pixels, mask, width: w, height: h, originX: ox, originY: oy };
}

/** Clear layer pixels where selectionMask == 1 (transparent hole). */
export function clearUnderMask(
  layerPixels: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  selectionMask: Uint8Array,
): boolean {
  let changed = false;
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const i = y * canvasWidth + x;
      if (selectionMask[i]! === 0) continue;
      const off = i * 4;
      if (
        layerPixels[off]! !== 0 ||
        layerPixels[off + 1]! !== 0 ||
        layerPixels[off + 2]! !== 0 ||
        layerPixels[off + 3]! !== 0
      ) {
        changed = true;
      }
      layerPixels[off] = 0;
      layerPixels[off + 1] = 0;
      layerPixels[off + 2] = 0;
      layerPixels[off + 3] = 0;
    }
  }
  return changed;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Snap rotation to nearest 15° when Shift is held (Photoshop Free Transform). */
export function snapRotationDegrees(degrees: number, snap: boolean): number {
  if (!snap) return degrees;
  return Math.round(degrees / 15) * 15;
}

/**
 * Destination-driven nearest-neighbor sample of float source through transform.
 * Returns canvas-sized RGBA (transparent outside stamp) and optional mask footprint.
 */
export function sampleFloatToCanvas(
  sourcePixels: Uint8ClampedArray,
  sourceMask: Uint8Array,
  sourceW: number,
  sourceH: number,
  transform: FloatTransform,
  canvasWidth: number,
  canvasHeight: number,
): { pixels: Uint8ClampedArray; mask: Uint8Array; stampBBox: MaskBBox | null } {
  const outPixels = createEmptyPixels(canvasWidth, canvasHeight);
  const outMask = createEmptyMask(canvasWidth, canvasHeight);

  const { x: tx, y: ty, w: tw, h: th, rotation } = transform;
  const clampedW = Math.max(1, Math.round(tw));
  const clampedH = Math.max(1, Math.round(th));
  const cx = tx + clampedW / 2;
  const cy = ty + clampedH / 2;
  const rad = degToRad(rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // AABB of rotated rectangle covering all dest pixels that might sample source.
  const hw = clampedW / 2;
  const hh = clampedH / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    const rx = c.x * cos - c.y * sin + cx;
    const ry = c.x * sin + c.y * cos + cy;
    if (rx < minX) minX = rx;
    if (ry < minY) minY = ry;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }

  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const x1 = Math.min(canvasWidth - 1, Math.ceil(maxX));
  const y1 = Math.min(canvasHeight - 1, Math.ceil(maxY));

  if (x0 > x1 || y0 > y1) {
    return { pixels: outPixels, mask: outMask, stampBBox: null };
  }

  const invCos = cos;
  const invSin = -sin;

  for (let dy = y0; dy <= y1; dy++) {
    for (let dx = x0; dx <= x1; dx++) {
      // Dest pixel center → local float space (unrotated, origin top-left of transform bbox).
      const px = dx + 0.5 - cx;
      const py = dy + 0.5 - cy;
      const lx = px * invCos - py * invSin;
      const ly = px * invSin + py * invCos;
      const localX = lx + hw;
      const localY = ly + hh;

      if (localX < 0 || localY < 0 || localX >= clampedW || localY >= clampedH) {
        continue;
      }

      // Map into source buffer via scale.
      const sx = Math.floor((localX / clampedW) * sourceW);
      const sy = Math.floor((localY / clampedH) * sourceH);
      if (sx < 0 || sy < 0 || sx >= sourceW || sy >= sourceH) continue;
      const sIdx = sy * sourceW + sx;
      if (sourceMask[sIdx]! === 0) continue;

      const sOff = sIdx * 4;
      const dOff = (dy * canvasWidth + dx) * 4;
      outPixels[dOff] = sourcePixels[sOff]!;
      outPixels[dOff + 1] = sourcePixels[sOff + 1]!;
      outPixels[dOff + 2] = sourcePixels[sOff + 2]!;
      outPixels[dOff + 3] = sourcePixels[sOff + 3]!;
      outMask[dy * canvasWidth + dx] = 1;
    }
  }

  return {
    pixels: outPixels,
    mask: outMask,
    stampBBox: maskBBox(outMask, canvasWidth, canvasHeight),
  };
}

/** Stamp float sample onto layer (source-over where float alpha > 0 / mask bit). */
export function stampFloatOntoLayer(
  layerPixels: Uint8ClampedArray,
  floatPixels: Uint8ClampedArray,
  floatMask: Uint8Array,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  let changed = false;
  const n = canvasWidth * canvasHeight;
  for (let i = 0; i < n; i++) {
    if (floatMask[i]! === 0) continue;
    const off = i * 4;
    const a = floatPixels[off + 3]!;
    // Transparent float pixels still occupy mask — leave transparent (hole already cut).
    if (
      layerPixels[off]! !== floatPixels[off]! ||
      layerPixels[off + 1]! !== floatPixels[off + 1]! ||
      layerPixels[off + 2]! !== floatPixels[off + 2]! ||
      layerPixels[off + 3]! !== a
    ) {
      changed = true;
    }
    layerPixels[off] = floatPixels[off]!;
    layerPixels[off + 1] = floatPixels[off + 1]!;
    layerPixels[off + 2] = floatPixels[off + 2]!;
    layerPixels[off + 3] = a;
  }
  return changed;
}

export function cloneFloatTransform(t: FloatTransform): FloatTransform {
  return { x: t.x, y: t.y, w: t.w, h: t.h, rotation: t.rotation };
}

export function identityTransformFromExtract(
  extract: ExtractedSelection,
): FloatTransform {
  return {
    x: extract.originX,
    y: extract.originY,
    w: extract.width,
    h: extract.height,
    rotation: 0,
  };
}

/** Aspect-lock scale: keep ratio from original source size while resizing from a handle. */
export function applyAspectLock(
  newW: number,
  newH: number,
  aspectW: number,
  aspectH: number,
): { w: number; h: number } {
  const aw = Math.max(1, aspectW);
  const ah = Math.max(1, aspectH);
  const ratio = aw / ah;
  if (Math.abs(newW / Math.max(1, newH) - ratio) < Math.abs(newH * ratio - newW) / Math.max(1, newH)) {
    // Prefer height-driven
    const h = Math.max(1, Math.round(newH));
    return { w: Math.max(1, Math.round(h * ratio)), h };
  }
  const w = Math.max(1, Math.round(newW));
  return { w, h: Math.max(1, Math.round(w / ratio)) };
}

export { clonePixels, cloneMask };
