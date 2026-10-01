import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { createEmptyPixels } from "./pixels";

/** Longest side after the backend `fitInsideMaxEdge` step. */
export const FITTED_MAX_EDGE = 400;

export const PLACEMENT_MODES = ["center", "fit", "stretch", "top-left"] as const;

export type PlacementMode = (typeof PLACEMENT_MODES)[number];

export const PLACEMENT_MODE_LABELS: Record<PlacementMode, string> = {
  center: "По центру",
  fit: "Вписать",
  stretch: "Растянуть",
  "top-left": "Сверху слева",
};

export const PLACEMENT_MODE_HINTS: Record<PlacementMode, string> = {
  center: "1:1 по центру. Больше холста — обрезка, меньше — прозрачные поля.",
  fit: "Уменьшить длинную сторону до холста и поставить по центру.",
  stretch: "Растянуть ровно на весь холст. Пропорции изменятся.",
  "top-left": "1:1 от левого верхнего угла.",
};

export type PlacementInfo = {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  cropped: boolean;
  letterboxed: boolean;
  placedWidth: number;
  placedHeight: number;
};

/**
 * Approximate the fitted size Sharp produces with `resize(maxEdge, maxEdge, { fit: "inside" })`.
 * Smaller sources are enlarged so the long edge becomes `maxEdge`.
 */
export function estimateFittedSize(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge = FITTED_MAX_EDGE,
): { width: number; height: number } {
  const width = Math.max(1, Math.floor(sourceWidth));
  const height = Math.max(1, Math.floor(sourceHeight));
  const longest = Math.max(width, height);
  const scale = maxEdge / longest;
  let fittedWidth = Math.max(1, Math.round(width * scale));
  let fittedHeight = Math.max(1, Math.round(height * scale));
  if (fittedWidth > maxEdge) {
    fittedWidth = maxEdge;
  }
  if (fittedHeight > maxEdge) {
    fittedHeight = maxEdge;
  }
  return { width: fittedWidth, height: fittedHeight };
}

/** `floor(fitted / pixelSize)` forecast shown before the pixelate request. */
export function estimateNativeSize(
  sourceWidth: number,
  sourceHeight: number,
  pixelSize: number,
  maxEdge = FITTED_MAX_EDGE,
): { width: number; height: number } {
  const fitted = estimateFittedSize(sourceWidth, sourceHeight, maxEdge);
  const clamped = Math.min(
    Math.max(1, Math.floor(pixelSize)),
    fitted.width,
    fitted.height,
  );
  return {
    width: Math.max(1, Math.floor(fitted.width / clamped)),
    height: Math.max(1, Math.floor(fitted.height / clamped)),
  };
}

/**
 * Blit a native pixel grid onto the editor canvas.
 * `center` and `top-left` keep 1:1 density. `fit` only shrinks. `stretch` fills the canvas.
 */
export function placeNativeGrid(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  mode: PlacementMode,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
): PlacementInfo {
  if (
    sourceWidth < 1 ||
    sourceHeight < 1 ||
    canvasWidth < 1 ||
    canvasHeight < 1 ||
    source.length < sourceWidth * sourceHeight * 4
  ) {
    throw new Error("Некорректный native-буфер");
  }

  const { destWidth, destHeight } = destinationSize(
    sourceWidth,
    sourceHeight,
    canvasWidth,
    canvasHeight,
    mode,
  );
  const originX = mode === "top-left" ? 0 : Math.floor((canvasWidth - destWidth) / 2);
  const originY = mode === "top-left" ? 0 : Math.floor((canvasHeight - destHeight) / 2);
  const pixels = createEmptyPixels(canvasWidth, canvasHeight);

  blitNearest(
    source,
    sourceWidth,
    sourceHeight,
    pixels,
    canvasWidth,
    canvasHeight,
    destWidth,
    destHeight,
    originX,
    originY,
  );

  return {
    pixels,
    cropped:
      originX < 0 ||
      originY < 0 ||
      originX + destWidth > canvasWidth ||
      originY + destHeight > canvasHeight,
    letterboxed: destWidth < canvasWidth || destHeight < canvasHeight,
    placedWidth: Math.min(destWidth, canvasWidth),
    placedHeight: Math.min(destHeight, canvasHeight),
  };
}

/** Unique opaque `#rrggbb` colors in first-seen order. Transparent pixels are skipped. */
export function collectOpaquePaletteHexes(pixels: Uint8ClampedArray): string[] {
  const seen = new Set<string>();
  const hexes: string[] = [];

  for (let offset = 0; offset < pixels.length; offset += 4) {
    if ((pixels[offset + 3] ?? 0) === 0) {
      continue;
    }
    const hex = `#${byteToHex(pixels[offset] ?? 0)}${byteToHex(pixels[offset + 1] ?? 0)}${byteToHex(pixels[offset + 2] ?? 0)}`;
    if (seen.has(hex)) {
      continue;
    }
    seen.add(hex);
    hexes.push(hex);
  }

  return hexes;
}

function destinationSize(
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  mode: PlacementMode,
): { destWidth: number; destHeight: number } {
  if (mode === "stretch") {
    return { destWidth: canvasWidth, destHeight: canvasHeight };
  }
  if (mode === "fit") {
    const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight, 1);
    return {
      destWidth: Math.max(1, Math.min(canvasWidth, Math.round(sourceWidth * scale))),
      destHeight: Math.max(1, Math.min(canvasHeight, Math.round(sourceHeight * scale))),
    };
  }
  return { destWidth: sourceWidth, destHeight: sourceHeight };
}

function blitNearest(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  dest: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  destWidth: number,
  destHeight: number,
  originX: number,
  originY: number,
): void {
  for (let y = 0; y < destHeight; y += 1) {
    const canvasY = originY + y;
    if (canvasY < 0 || canvasY >= canvasHeight) {
      continue;
    }
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y * sourceHeight) / destHeight));
    for (let x = 0; x < destWidth; x += 1) {
      const canvasX = originX + x;
      if (canvasX < 0 || canvasX >= canvasWidth) {
        continue;
      }
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x * sourceWidth) / destWidth));
      const sourceOffset = (sourceY * sourceWidth + sourceX) * 4;
      const destOffset = (canvasY * canvasWidth + canvasX) * 4;
      dest[destOffset] = source[sourceOffset] ?? 0;
      dest[destOffset + 1] = source[sourceOffset + 1] ?? 0;
      dest[destOffset + 2] = source[sourceOffset + 2] ?? 0;
      dest[destOffset + 3] = source[sourceOffset + 3] ?? 0;
    }
  }
}

function byteToHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}
