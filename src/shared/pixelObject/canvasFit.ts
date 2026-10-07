export type Size2D = { width: number; height: number };

export type CenterCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** True when either edge exceeds the catalog canvas max. */
export function exceedsCanvasMax(size: Size2D, canvasMax: number): boolean {
  return size.width > canvasMax || size.height > canvasMax;
}

export function canvasOversizeReason(size: Size2D, canvasMax: number): string | null {
  if (!exceedsCanvasMax(size, canvasMax)) {
    return null;
  }
  return (
    `Холст ${size.width}×${size.height} больше лимита каталога ${canvasMax}×${canvasMax}. ` +
    "Выберите уменьшение (nearest) или обрезку по центру — исходник не меняется сам."
  );
}

/** Fit inside max×max preserving aspect via floor nearest scale. */
export function nearestDownscaleSize(size: Size2D, canvasMax: number): Size2D {
  if (!exceedsCanvasMax(size, canvasMax)) {
    return { width: size.width, height: size.height };
  }
  const scale = Math.min(canvasMax / size.width, canvasMax / size.height);
  return {
    width: Math.max(1, Math.floor(size.width * scale)),
    height: Math.max(1, Math.floor(size.height * scale)),
  };
}

/** Largest axis-aligned crop ≤ max on each edge, centered. */
export function centerCropRect(size: Size2D, canvasMax: number): CenterCropRect {
  const width = Math.min(size.width, canvasMax);
  const height = Math.min(size.height, canvasMax);
  return {
    x: Math.floor((size.width - width) / 2),
    y: Math.floor((size.height - height) / 2),
    width,
    height,
  };
}

/** Nearest-neighbor resample to an arbitrary target size (up or down). */
export function resampleNearest(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  for (let y = 0; y < dstHeight; y += 1) {
    const srcY = Math.min(srcHeight - 1, Math.floor((y + 0.5) * srcHeight / dstHeight));
    for (let x = 0; x < dstWidth; x += 1) {
      const srcX = Math.min(srcWidth - 1, Math.floor((x + 0.5) * srcWidth / dstWidth));
      const src = (srcY * srcWidth + srcX) * 4;
      const dst = (y * dstWidth + x) * 4;
      out[dst] = pixels[src] ?? 0;
      out[dst + 1] = pixels[src + 1] ?? 0;
      out[dst + 2] = pixels[src + 2] ?? 0;
      out[dst + 3] = pixels[src + 3] ?? 0;
    }
  }
  return out;
}

export function cropPixels(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  rect: CenterCropRect,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const srcY = rect.y + y;
    if (srcY < 0 || srcY >= srcHeight) {
      continue;
    }
    for (let x = 0; x < rect.width; x += 1) {
      const srcX = rect.x + x;
      if (srcX < 0 || srcX >= srcWidth) {
        continue;
      }
      const src = (srcY * srcWidth + srcX) * 4;
      const dst = (y * rect.width + x) * 4;
      out[dst] = pixels[src] ?? 0;
      out[dst + 1] = pixels[src + 1] ?? 0;
      out[dst + 2] = pixels[src + 2] ?? 0;
      out[dst + 3] = pixels[src + 3] ?? 0;
    }
  }
  return out;
}

export function downscaleFrame(
  pixels: Uint8ClampedArray,
  size: Size2D,
  canvasMax: number,
): { pixels: Uint8ClampedArray; size: Size2D } {
  const target = nearestDownscaleSize(size, canvasMax);
  if (target.width === size.width && target.height === size.height) {
    return { pixels: new Uint8ClampedArray(pixels), size };
  }
  return {
    pixels: resampleNearest(pixels, size.width, size.height, target.width, target.height),
    size: target,
  };
}

export function centerCropFrame(
  pixels: Uint8ClampedArray,
  size: Size2D,
  canvasMax: number,
): { pixels: Uint8ClampedArray; size: Size2D } {
  const rect = centerCropRect(size, canvasMax);
  return {
    pixels: cropPixels(pixels, size.width, size.height, rect),
    size: { width: rect.width, height: rect.height },
  };
}
