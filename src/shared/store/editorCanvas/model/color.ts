export type Rgba = readonly [r: number, g: number, b: number, a: number];

export const TRANSPARENT_RGBA: Rgba = [0, 0, 0, 0];

/** Parse `#rgb` / `#rrggbb` / `#rrggbbaa` into RGBA 0–255. Invalid input → black opaque. */
export function hexToRgba(hex: string, alpha = 255): Rgba {
  const raw = hex.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const r = Number.parseInt(raw[0] + raw[0], 16);
    const g = Number.parseInt(raw[1] + raw[1], 16);
    const b = Number.parseInt(raw[2] + raw[2], 16);
    return [r, g, b, clampByte(alpha)];
  }

  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);
    return [r, g, b, clampByte(alpha)];
  }

  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);
    const a = Number.parseInt(raw.slice(6, 8), 16);
    return [r, g, b, a];
  }

  return [0, 0, 0, clampByte(alpha)];
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 255;
  }
  return Math.max(0, Math.min(255, Math.round(value)));
}
