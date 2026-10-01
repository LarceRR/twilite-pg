import { formatHexForField, hexToRgb, normalizeHex, tryParsePartialHex } from "./colorMath";

export type ColorFormat = "hex" | "rgb" | "rgba" | "hsl" | "hsla";

export const COLOR_FORMATS: readonly { id: ColorFormat; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "rgba", label: "RGBA" },
  { id: "hsl", label: "HSL" },
  { id: "hsla", label: "HSLA" },
];

export type ParsedColorField = {
  hex: string;
  alphaPercent: number;
};

function clampAlphaPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseAlphaToken(token: string): number | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("%")) {
    const n = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(n) ? clampAlphaPercent(n) : null;
  }
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) {
    return null;
  }
  if (n <= 1) {
    return clampAlphaPercent(n * 100);
  }
  return clampAlphaPercent(n);
}

function parseChannelList(raw: string, count: number): number[] | null {
  const inner = raw.trim().replace(/^(rgb|rgba|hsl|hsla)\(/i, "").replace(/\)$/, "");
  const parts = inner.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < count) {
    return null;
  }
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const token = parts[index]!;
    const isPercent = token.endsWith("%");
    const n = Number.parseFloat(isPercent ? token.slice(0, -1) : token);
    if (!Number.isFinite(n)) {
      return null;
    }
    values.push(n);
  }
  return values;
}

function rgbToHsl(r: number, g: number, b: number): [h: number, s: number, l: number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    const s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
    return [h, s * 100, l * 100];
  }

  return [0, 0, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [r: number, g: number, b: number] {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hn = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = ln - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hn < 1) {
    rp = c;
    gp = x;
  } else if (hn < 2) {
    rp = x;
    gp = c;
  } else if (hn < 3) {
    gp = c;
    bp = x;
  } else if (hn < 4) {
    gp = x;
    bp = c;
  } else if (hn < 5) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
}

export function formatColorField(
  hex: string,
  alphaPercent: number,
  format: ColorFormat,
): string {
  const normalized = normalizeHex(hex);
  const [r, g, b] = hexToRgb(normalized);
  const [h, s, l] = rgbToHsl(r, g, b);
  const a = clampAlphaPercent(alphaPercent);

  switch (format) {
    case "hex":
      return formatHexForField(normalized);
    case "rgb":
      return `${r}, ${g}, ${b}`;
    case "rgba":
      return `${r}, ${g}, ${b}, ${a}%`;
    case "hsl":
      return `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;
    case "hsla":
      return `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a}%`;
  }
}

export function parseColorField(
  raw: string,
  format: ColorFormat,
  fallbackAlpha: number,
): ParsedColorField | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (format === "hex") {
    const hex = tryParsePartialHex(trimmed);
    return hex ? { hex, alphaPercent: clampAlphaPercent(fallbackAlpha) } : null;
  }

  if (format === "rgb" || format === "rgba") {
    const channels = parseChannelList(trimmed, format === "rgb" ? 3 : 4);
    if (!channels) {
      return null;
    }
    const [r, g, b] = channels;
    if ([r, g, b].some((channel) => channel < 0 || channel > 255)) {
      return null;
    }
    let alphaPercent = clampAlphaPercent(fallbackAlpha);
    if (format === "rgba" && channels[3] !== undefined) {
      const parsedAlpha = parseAlphaToken(String(channels[3]));
      if (parsedAlpha === null) {
        return null;
      }
      alphaPercent = parsedAlpha;
    }
    return { hex: normalizeHex(rgbToHexChannels(r, g, b)), alphaPercent };
  }

  const channels = parseChannelList(trimmed, format === "hsl" ? 3 : 4);
  if (!channels) {
    return null;
  }
  const [h, s, l] = channels;
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
    return null;
  }
  let alphaPercent = clampAlphaPercent(fallbackAlpha);
  if (format === "hsla" && channels[3] !== undefined) {
    const parsedAlpha = parseAlphaToken(String(channels[3]));
    if (parsedAlpha === null) {
      return null;
    }
    alphaPercent = parsedAlpha;
  }
  const [r, g, b] = hslToRgb(h, s, l);
  return { hex: normalizeHex(rgbToHexChannels(r, g, b)), alphaPercent };
}

function rgbToHexChannels(r: number, g: number, b: number): string {
  const clamp = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}
