import type { Rgba } from "./color";

export type FillConnectivity = 4 | 8;

/** Exact RGBA match; any two fully transparent pixels are equal regardless of RGB. */
export function samePixel(a: Rgba, b: Rgba, tolerance = 0): boolean {
  if (a[3] === 0 && b[3] === 0) {
    return true;
  }
  return (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance &&
    Math.abs(a[3] - b[3]) <= tolerance
  );
}

function readPixel(pixels: Uint8ClampedArray, index: number): Rgba {
  const offset = index * 4;
  return [pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!, pixels[offset + 3]!];
}

function scanFlood(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  connectivity: FillConnectivity,
  blocked: (target: Rgba) => boolean,
  visit: (index: number) => void,
): number {
  if (
    !Number.isInteger(seedX) ||
    !Number.isInteger(seedY) ||
    seedX < 0 ||
    seedY < 0 ||
    seedX >= width ||
    seedY >= height
  ) {
    return 0;
  }

  const target = readPixel(pixels, seedY * width + seedX);
  if (blocked(target)) {
    return 0;
  }

  const visited = new Uint8Array(width * height);
  const transparentTarget = target[3] === 0;
  const matches = (index: number): boolean => {
    if (visited[index]) {
      return false;
    }
    const offset = index * 4;
    if (transparentTarget) {
      return pixels[offset + 3] === 0;
    }
    return (
      pixels[offset] === target[0] &&
      pixels[offset + 1] === target[1] &&
      pixels[offset + 2] === target[2] &&
      pixels[offset + 3] === target[3]
    );
  };
  const accept = (index: number) => {
    visited[index] = 1;
    visit(index);
  };

  const diagonal = connectivity === 8 ? 1 : 0;
  const stack: number[] = [seedX, seedY];
  let filled = 0;

  const pushRuns = (fromX: number, toX: number, y: number) => {
    if (y < 0 || y >= height) {
      return;
    }
    const row = y * width;
    let inRun = false;
    for (let x = fromX; x <= toX; x += 1) {
      if (matches(row + x)) {
        if (!inRun) {
          stack.push(x, y);
          inRun = true;
        }
      } else {
        inRun = false;
      }
    }
  };

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const row = y * width;
    if (!matches(row + x)) {
      continue;
    }

    let left = x;
    while (left > 0 && matches(row + left - 1)) {
      left -= 1;
    }
    let right = x;
    while (right < width - 1 && matches(row + right + 1)) {
      right += 1;
    }

    for (let cx = left; cx <= right; cx += 1) {
      accept(row + cx);
    }
    filled += right - left + 1;

    const scanFrom = Math.max(0, left - diagonal);
    const scanTo = Math.min(width - 1, right + diagonal);
    pushRuns(scanFrom, scanTo, y - 1);
    pushRuns(scanFrom, scanTo, y + 1);
  }

  return filled;
}

/**
 * Scanline contiguous flood fill in place. Returns the number of pixels written;
 * 0 means no-op (out of bounds or seed already equals the fill color).
 */
export function floodFill(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  rgba: Rgba,
  connectivity: FillConnectivity = 4,
): number {
  return scanFlood(
    pixels,
    width,
    height,
    seedX,
    seedY,
    connectivity,
    (target) => samePixel(target, rgba),
    (index) => {
      const offset = index * 4;
      pixels[offset] = rgba[0];
      pixels[offset + 1] = rgba[1];
      pixels[offset + 2] = rgba[2];
      pixels[offset + 3] = rgba[3];
    },
  );
}

/**
 * Mark every pixel in the contiguous region under the seed. Does not modify pixels.
 * `mask` must already be zeroed and at least `width * height` long.
 */
export function markFloodRegion(
  pixels: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  connectivity: FillConnectivity = 4,
): number {
  return scanFlood(
    pixels,
    width,
    height,
    seedX,
    seedY,
    connectivity,
    () => false,
    (index) => {
      mask[index] = 1;
    },
  );
}
