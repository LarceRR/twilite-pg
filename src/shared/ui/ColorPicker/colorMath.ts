export type Hsv = {
  /** 0–360 */
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  v: number;
};

const HEX6 = /^[0-9a-fA-F]{6}$/;
const HEX3 = /^[0-9a-fA-F]{3}$/;

/** Lowercase `#rrggbb`. Unparseable input → `#000000` (HTML color input default). */
export function normalizeHex(input: string): string {
  const raw = input.trim().replace(/^#/, "");

  if (HEX3.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
  }

  if (HEX6.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }

  return "#000000";
}

export function hexToRgb(hex: string): [r: number, g: number, b: number] {
  const normalized = normalizeHex(hex);
  const raw = normalized.slice(1);
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
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
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;

  return { h, s, v };
}

export function hsvToRgb(hsv: Hsv): [r: number, g: number, b: number] {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, hsv.s)) / 100;
  const v = Math.max(0, Math.min(100, hsv.v)) / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
}

export function hsvToHex(hsv: Hsv): string {
  const [r, g, b] = hsvToRgb(hsv);
  return rgbToHex(r, g, b);
}

/** True when two HSV states produce the same committed hex. */
export function hsvMatchesHex(hsv: Hsv, hex: string): boolean {
  return hsvToHex(hsv) === normalizeHex(hex);
}

/** Partial hex typing: returns normalized hex or null if still incomplete/invalid. */
export function tryParsePartialHex(draft: string): string | null {
  const trimmed = draft.trim().replace(/^#/, "");
  if (trimmed.length === 0) {
    return null;
  }
  if (!/^[0-9a-fA-F]*$/.test(trimmed)) {
    return null;
  }
  if (trimmed.length < 6) {
    return null;
  }
  if (trimmed.length === 6) {
    return normalizeHex(trimmed);
  }
  if (trimmed.length > 6) {
    return null;
  }
  return null;
}

export function formatHexForField(hex: string): string {
  return normalizeHex(hex).slice(1).toUpperCase();
}
