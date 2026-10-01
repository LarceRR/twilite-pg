function exactBuffer(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  const bytes = width * height * 4;
  if (pixels.length === bytes) {
    return pixels as Uint8ClampedArray<ArrayBuffer>;
  }
  const copy = new Uint8ClampedArray(bytes);
  copy.set(pixels.subarray(0, bytes));
  return copy;
}

export type ResolvedPixelGrid = {
  /** Integer cell size. `1` means the file is already one pixel per cell. */
  scale: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
};

type AxisRuns = {
  /** GCD of constant-color run lengths along this axis. */
  step: number;
  /** True when at least one color boundary was found. */
  edged: boolean;
};

/**
 * Greatest integer k such that the buffer is a grid of k×k constant-color cells.
 * A solid image and anything with a broken grid stay 1:1.
 */
export function resolvePixelGrid(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): ResolvedPixelGrid {
  if (width < 1 || height < 1 || pixels.length < width * height * 4) {
    throw new Error("Некорректный буфер сетки");
  }

  const horizontal = axisRuns(pixels, width, height, "horizontal");
  const vertical = axisRuns(pixels, width, height, "vertical");
  const scale = squareScale(horizontal, vertical, width, height);

  if (scale <= 1 || !blocksAreUniform(pixels, width, height, scale)) {
    return {
      scale: 1,
      width,
      height,
      pixels: exactBuffer(pixels, width, height),
    };
  }

  return {
    scale,
    width: width / scale,
    height: height / scale,
    pixels: downsample(pixels, width, height, scale),
  };
}

function squareScale(horizontal: AxisRuns, vertical: AxisRuns, width: number, height: number): number {
  if (!horizontal.edged && !vertical.edged) {
    return 1;
  }
  const step = gcd(horizontal.step, vertical.step);
  if (step <= 1 || width % step !== 0 || height % step !== 0) {
    return 1;
  }
  return step;
}

function axisRuns(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  axis: "horizontal" | "vertical",
): AxisRuns {
  const outer = axis === "horizontal" ? height : width;
  const inner = axis === "horizontal" ? width : height;
  let step = 0;
  let edged = false;

  for (let outerIndex = 0; outerIndex < outer; outerIndex += 1) {
    let run = 1;
    for (let innerIndex = 1; innerIndex < inner; innerIndex += 1) {
      const previous = offsetAt(axis, innerIndex - 1, outerIndex, width);
      const current = offsetAt(axis, innerIndex, outerIndex, width);
      if (samePixel(pixels, previous, current)) {
        run += 1;
        continue;
      }
      edged = true;
      step = step === 0 ? run : gcd(step, run);
      run = 1;
      if (step === 1) {
        return { step: 1, edged: true };
      }
    }
    if (run !== inner) {
      edged = true;
    }
    step = step === 0 ? run : gcd(step, run);
    if (step === 1) {
      return { step: 1, edged };
    }
  }

  return { step: step === 0 ? inner : step, edged };
}

function offsetAt(
  axis: "horizontal" | "vertical",
  innerIndex: number,
  outerIndex: number,
  width: number,
): number {
  if (axis === "horizontal") {
    return (outerIndex * width + innerIndex) * 4;
  }
  return (innerIndex * width + outerIndex) * 4;
}

function blocksAreUniform(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
): boolean {
  for (let originY = 0; originY < height; originY += scale) {
    for (let originX = 0; originX < width; originX += scale) {
      const origin = (originY * width + originX) * 4;
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          if (x === 0 && y === 0) {
            continue;
          }
          const index = ((originY + y) * width + (originX + x)) * 4;
          if (!samePixel(pixels, origin, index)) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

function downsample(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
): Uint8ClampedArray<ArrayBuffer> {
  const outWidth = width / scale;
  const outHeight = height / scale;
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      const src = (y * scale * width + x * scale) * 4;
      const dst = (y * outWidth + x) * 4;
      out[dst] = pixels[src] ?? 0;
      out[dst + 1] = pixels[src + 1] ?? 0;
      out[dst + 2] = pixels[src + 2] ?? 0;
      out[dst + 3] = pixels[src + 3] ?? 0;
    }
  }
  return out;
}

function samePixel(pixels: Uint8ClampedArray, a: number, b: number): boolean {
  return (
    pixels[a] === pixels[b] &&
    pixels[a + 1] === pixels[b + 1] &&
    pixels[a + 2] === pixels[b + 2] &&
    pixels[a + 3] === pixels[b + 3]
  );
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}
