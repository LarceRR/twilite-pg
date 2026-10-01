import { MAX_FRAMES } from "./constants";

export type PackedSheet = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  columns: number;
  rows: number;
};

export function sheetGrid(frameCount: number): { columns: number; rows: number } {
  const count = Math.max(1, frameCount);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return { columns, rows };
}

export function hasOpaquePixel(pixels: Uint8ClampedArray): boolean {
  for (let index = 3; index < pixels.length; index += 4) {
    if ((pixels[index] ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

/** Integer nearest-neighbor scale. Factor 1 returns a copy. */
export function scaleNearest(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  factor: number,
): Uint8ClampedArray {
  const scale = Math.max(1, Math.floor(factor));
  if (scale === 1) {
    return new Uint8ClampedArray(pixels);
  }

  const outWidth = width * scale;
  const outHeight = height * scale;
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 4;
      const r = pixels[src] ?? 0;
      const g = pixels[src + 1] ?? 0;
      const b = pixels[src + 2] ?? 0;
      const a = pixels[src + 3] ?? 0;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const dst = ((y * scale + dy) * outWidth + (x * scale + dx)) * 4;
          out[dst] = r;
          out[dst + 1] = g;
          out[dst + 2] = b;
          out[dst + 3] = a;
        }
      }
    }
  }

  return out;
}

/** Source-over onto an opaque background. Soft pixels stay, alpha becomes 255. */
export function compositeOnBackground(
  pixels: Uint8ClampedArray,
  background: readonly [number, number, number],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  const [br, bg, bb] = background;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = (pixels[index + 3] ?? 0) / 255;
    out[index] = Math.round((pixels[index] ?? 0) * alpha + br * (1 - alpha));
    out[index + 1] = Math.round((pixels[index + 1] ?? 0) * alpha + bg * (1 - alpha));
    out[index + 2] = Math.round((pixels[index + 2] ?? 0) * alpha + bb * (1 - alpha));
    out[index + 3] = 255;
  }
  return out;
}

/**
 * Pack composited frames into one transparent spritesheet.
 * Empty cells (when the grid is larger than the frame list) stay transparent.
 */
export function packSheet(
  frames: readonly Uint8ClampedArray[],
  frameWidth: number,
  frameHeight: number,
): PackedSheet {
  if (frames.length < 1 || frames.length > MAX_FRAMES) {
    throw new Error(`Нужно от 1 до ${MAX_FRAMES} кадров`);
  }

  const expected = frameWidth * frameHeight * 4;
  const { columns, rows } = sheetGrid(frames.length);
  const width = frameWidth * columns;
  const height = frameHeight * rows;
  const pixels = new Uint8ClampedArray(width * height * 4);

  frames.forEach((frame, index) => {
    if (frame.length !== expected) {
      throw new Error("Размер кадра не совпадает с холстом");
    }
    const col = index % columns;
    const row = Math.floor(index / columns);
    for (let y = 0; y < frameHeight; y += 1) {
      const src = y * frameWidth * 4;
      const dst = ((row * frameHeight + y) * width + col * frameWidth) * 4;
      pixels.set(frame.subarray(src, src + frameWidth * 4), dst);
    }
  });

  return { pixels, width, height, columns, rows };
}
