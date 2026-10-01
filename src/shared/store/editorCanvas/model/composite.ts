import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { createEmptyPixels } from "./pixels";
import type { BlendMode, CompositeLayerInput } from "./layerTypes";

type Premult = { r: number; g: number; b: number; a: number };

function toPremult(r: number, g: number, b: number, a: number): Premult {
  const an = a / 255;
  return { r: (r / 255) * an, g: (g / 255) * an, b: (b / 255) * an, a: an };
}

function fromPremult(p: Premult): [number, number, number, number] {
  if (p.a <= 0) {
    return [0, 0, 0, 0];
  }
  return [
    Math.round((p.r / p.a) * 255),
    Math.round((p.g / p.a) * 255),
    Math.round((p.b / p.a) * 255),
    Math.round(p.a * 255),
  ];
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Blend channel helpers operate in 0..1 straight RGB. */
function channelOverlay(cb: number, cs: number): number {
  if (cb < 0.5) {
    return 2 * cb * cs;
  }
  return 1 - 2 * (1 - cb) * (1 - cs);
}

function blendChannels(
  mode: BlendMode,
  sR: number,
  sG: number,
  sB: number,
  dR: number,
  dG: number,
  dB: number,
): [number, number, number] {
  switch (mode) {
    case "multiply":
      return [sR * dR, sG * dG, sB * dB];
    case "screen":
      return [
        1 - (1 - sR) * (1 - dR),
        1 - (1 - sG) * (1 - dG),
        1 - (1 - sB) * (1 - dB),
      ];
    case "overlay":
      return [
        channelOverlay(dR, sR),
        channelOverlay(dG, sG),
        channelOverlay(dB, sB),
      ];
    case "add":
      return [clamp01(sR + dR), clamp01(sG + dG), clamp01(sB + dB)];
    case "subtract":
      return [clamp01(dR - sR), clamp01(dG - sG), clamp01(dB - sB)];
    case "normal":
    default:
      return [sR, sG, sB];
  }
}

/**
 * SVG-style separable blend + Porter-Duff source-over.
 * When backdrop alpha is 0, colour = source (not black) — matches PS/CSS.
 * Spec shape: Cs' = (1 - αb) * Cs + αb * B(Cb, Cs), then src-over.
 */
export function blendPremult(
  mode: BlendMode,
  src: Premult,
  dst: Premult,
): Premult {
  if (src.a <= 0) {
    return dst;
  }

  const sa = src.a;
  const da = dst.a;
  const outA = sa + da * (1 - sa);

  if (outA <= 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (mode === "normal") {
    return {
      r: src.r + dst.r * (1 - sa),
      g: src.g + dst.g * (1 - sa),
      b: src.b + dst.b * (1 - sa),
      a: outA,
    };
  }

  const sR = src.r / sa;
  const sG = src.g / sa;
  const sB = src.b / sa;
  const dR = da > 0 ? dst.r / da : 0;
  const dG = da > 0 ? dst.g / da : 0;
  const dB = da > 0 ? dst.b / da : 0;

  const [bR, bG, bB] = blendChannels(mode, sR, sG, sB, dR, dG, dB);

  // Cs' = (1 - αb) * Cs + αb * B(Cb, Cs)
  const cR = (1 - da) * sR + da * bR;
  const cG = (1 - da) * sG + da * bG;
  const cB = (1 - da) * sB + da * bB;

  const srcBlended: Premult = {
    r: cR * sa,
    g: cG * sa,
    b: cB * sa,
    a: sa,
  };

  return {
    r: srcBlended.r + dst.r * (1 - sa),
    g: srcBlended.g + dst.g * (1 - sa),
    b: srcBlended.b + dst.b * (1 - sa),
    a: outA,
  };
}

export function compositeLayers(
  layers: readonly CompositeLayerInput[],
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): Uint8ClampedArray<ArrayBuffer> {
  const out = createEmptyPixels(width, height);
  const pixelCount = width * height;

  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) {
      continue;
    }
    if (layer.pixels.length < pixelCount * 4) {
      continue;
    }

    const opacity = Math.min(1, Math.max(0, layer.opacity));

    for (let i = 0; i < pixelCount; i += 1) {
      const o = i * 4;
      const srcA = (layer.pixels[o + 3]! / 255) * opacity;
      if (srcA <= 0) {
        continue;
      }

      const src = toPremult(
        layer.pixels[o]!,
        layer.pixels[o + 1]!,
        layer.pixels[o + 2]!,
        srcA * 255,
      );
      const dst = toPremult(out[o]!, out[o + 1]!, out[o + 2]!, out[o + 3]!);
      const blended = blendPremult(layer.blendMode, src, dst);
      const [r, g, b, a] = fromPremult(blended);
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
    }
  }

  return out;
}
