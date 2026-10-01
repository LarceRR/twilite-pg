import { clonePixels, createEmptyPixels } from "./pixels";

export type NativeCropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function snapRect(rect: NativeCropRect): NativeCropRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    w: Math.max(1, Math.round(rect.w)),
    h: Math.max(1, Math.round(rect.h)),
  };
}

const RESIZE_HANDLES = {
  n: { east: false, west: false, north: true, south: false },
  s: { east: false, west: false, north: false, south: true },
  e: { east: true, west: false, north: false, south: false },
  w: { east: false, west: true, north: false, south: false },
  ne: { east: true, west: false, north: true, south: false },
  nw: { east: false, west: true, north: true, south: false },
  se: { east: true, west: false, north: false, south: true },
  sw: { east: false, west: true, north: false, south: true },
} as const;

export type CropResizeHandle = keyof typeof RESIZE_HANDLES;

/**
 * Resize a crop from a handle.
 * The dragged edge moves; the opposite edge stays put.
 * `symmetric` moves the opposite edge by the same amount, so the center stays.
 */
export function resizeDraftRect(
  origin: NativeCropRect,
  handle: CropResizeHandle,
  dx: number,
  dy: number,
  symmetric: boolean,
): NativeCropRect {
  const edges = RESIZE_HANDLES[handle];
  let { x, y, w, h } = origin;

  if (symmetric) {
    const cx = origin.x + origin.w / 2;
    const cy = origin.y + origin.h / 2;
    if (edges.east) {
      w = origin.w + dx * 2;
    } else if (edges.west) {
      w = origin.w - dx * 2;
    }
    if (edges.south) {
      h = origin.h + dy * 2;
    } else if (edges.north) {
      h = origin.h - dy * 2;
    }
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    if (edges.east || edges.west) {
      x = cx - w / 2;
    }
    if (edges.north || edges.south) {
      y = cy - h / 2;
    }
    return snapRect({ x, y, w, h });
  }

  if (edges.east) {
    w = Math.max(1, Math.round(origin.w + dx));
  }
  if (edges.west) {
    w = Math.max(1, Math.round(origin.w - dx));
    x = origin.x + origin.w - w;
  }
  if (edges.south) {
    h = Math.max(1, Math.round(origin.h + dy));
  }
  if (edges.north) {
    h = Math.max(1, Math.round(origin.h - dy));
    y = origin.y + origin.h - h;
  }
  return snapRect({ x, y, w, h });
}

/** Keep rect inside sheet; shrink size if needed. */
export function clampRectToSheet(
  rect: NativeCropRect,
  sheetWidth: number,
  sheetHeight: number,
): NativeCropRect {
  const snapped = snapRect(rect);
  let { x, y, w, h } = snapped;
  w = Math.min(w, sheetWidth);
  h = Math.min(h, sheetHeight);
  x = Math.min(Math.max(0, x), Math.max(0, sheetWidth - w));
  y = Math.min(Math.max(0, y), Math.max(0, sheetHeight - h));
  return { x, y, w, h };
}

/**
 * Let the crop hang past the sheet so a frame flush to the edge can sit in the center.
 * Size is kept. At least one pixel of the rect must stay on the sheet.
 */
export function clampRectIntersectingSheet(
  rect: NativeCropRect,
  sheetWidth: number,
  sheetHeight: number,
): NativeCropRect {
  const snapped = snapRect(rect);
  const w = Math.max(1, snapped.w);
  const h = Math.max(1, snapped.h);
  const sheetW = Math.max(1, sheetWidth);
  const sheetH = Math.max(1, sheetHeight);
  const x = Math.min(sheetW - 1, Math.max(1 - w, snapped.x));
  const y = Math.min(sheetH - 1, Math.max(1 - h, snapped.y));
  return { x, y, w, h };
}

/** Largest axis-aligned rect with given aspect ratio that fits in the sheet. */
export function maxAspectRectInSheet(
  sheetWidth: number,
  sheetHeight: number,
  aspectWidth: number,
  aspectHeight: number,
): NativeCropRect {
  const aw = Math.max(1, aspectWidth);
  const ah = Math.max(1, aspectHeight);
  const sheetW = Math.max(1, sheetWidth);
  const sheetH = Math.max(1, sheetHeight);

  let w = sheetW;
  let h = Math.floor((w * ah) / aw);
  if (h > sheetH) {
    h = sheetH;
    w = Math.floor((h * aw) / ah);
  }
  w = Math.max(1, Math.min(w, sheetW));
  h = Math.max(1, Math.min(h, sheetH));
  return {
    x: Math.floor((sheetW - w) / 2),
    y: Math.floor((sheetH - h) / 2),
    w,
    h,
  };
}

/** Next cell to the right, or wrap to the row below; stays put if neither fits. */
export function nextAdjacentRect(
  prev: NativeCropRect,
  sheetWidth: number,
  sheetHeight: number,
): NativeCropRect {
  const w = Math.max(1, prev.w);
  const h = Math.max(1, prev.h);
  const rightX = prev.x + w;
  if (rightX + w <= sheetWidth) {
    return clampRectToSheet({ x: rightX, y: prev.y, w, h }, sheetWidth, sheetHeight);
  }
  const downY = prev.y + h;
  if (downY + h <= sheetHeight) {
    return clampRectToSheet({ x: 0, y: downY, w, h }, sheetWidth, sheetHeight);
  }
  return clampRectToSheet({ x: prev.x, y: prev.y, w, h }, sheetWidth, sheetHeight);
}

export function extractNativeRect(
  native: Uint8ClampedArray,
  nativeWidth: number,
  nativeHeight: number,
  rect: NativeCropRect,
): { pixels: Uint8ClampedArray; width: number; height: number } {
  const snapped = snapRect(rect);
  const w = Math.max(1, snapped.w);
  const h = Math.max(1, snapped.h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row += 1) {
    const srcY = snapped.y + row;
    if (srcY < 0 || srcY >= nativeHeight) {
      continue;
    }
    for (let col = 0; col < w; col += 1) {
      const srcX = snapped.x + col;
      if (srcX < 0 || srcX >= nativeWidth) {
        continue;
      }
      const src = (srcY * nativeWidth + srcX) * 4;
      const dst = (row * w + col) * 4;
      pixels[dst] = native[src]!;
      pixels[dst + 1] = native[src + 1]!;
      pixels[dst + 2] = native[src + 2]!;
      pixels[dst + 3] = native[src + 3]!;
    }
  }
  return { pixels, width: w, height: h };
}

export function scaleNearestToCanvas(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
  for (let y = 0; y < canvasHeight; y += 1) {
    const srcY = Math.min(sourceHeight - 1, Math.floor((y * sourceHeight) / canvasHeight));
    for (let x = 0; x < canvasWidth; x += 1) {
      const srcX = Math.min(sourceWidth - 1, Math.floor((x * sourceWidth) / canvasWidth));
      const srcIndex = (srcY * sourceWidth + srcX) * 4;
      const dstIndex = (y * canvasWidth + x) * 4;
      out[dstIndex] = source[srcIndex]!;
      out[dstIndex + 1] = source[srcIndex + 1]!;
      out[dstIndex + 2] = source[srcIndex + 2]!;
      out[dstIndex + 3] = source[srcIndex + 3]!;
    }
  }
  return clonePixels(out);
}

/**
 * Copy a native crop into a frame buffer at 1:1 from the top-left.
 * Pixels outside the crop stay transparent. The crop must fit the frame.
 */
export function blitNativeRect(
  native: Uint8ClampedArray,
  nativeWidth: number,
  nativeHeight: number,
  rect: NativeCropRect,
  frameWidth: number,
  frameHeight: number,
): Uint8ClampedArray<ArrayBuffer> {
  if (frameWidth < 1 || frameHeight < 1) {
    throw new Error("Некорректный размер кадра");
  }
  const crop = extractNativeRect(native, nativeWidth, nativeHeight, rect);
  if (crop.width > frameWidth || crop.height > frameHeight) {
    throw new Error("Кадр больше общего размера");
  }
  const out = createEmptyPixels(frameWidth, frameHeight);
  for (let row = 0; row < crop.height; row += 1) {
    const src = row * crop.width * 4;
    out.set(crop.pixels.subarray(src, src + crop.width * 4), row * frameWidth * 4);
  }
  return out;
}

/** Crop native grid rect and scale to canvas with nearest-neighbor. */
export function sampleNativeRectToCanvas(
  native: Uint8ClampedArray,
  nativeWidth: number,
  nativeHeight: number,
  rect: NativeCropRect,
  canvasWidth: number,
  canvasHeight: number,
): Uint8ClampedArray<ArrayBuffer> {
  if (nativeWidth < 1 || nativeHeight < 1 || canvasWidth < 1 || canvasHeight < 1) {
    throw new Error("Некорректный размер сетки");
  }
  const expected = nativeWidth * nativeHeight * 4;
  if (native.length !== expected) {
    throw new Error("Некорректный размер буфера");
  }
  const crop = extractNativeRect(native, nativeWidth, nativeHeight, rect);
  return scaleNearestToCanvas(crop.pixels, crop.width, crop.height, canvasWidth, canvasHeight);
}
