export type PaletteSource = "picker" | "canvas" | "import";

/**
 * A used color becomes a new swatch only when some RGB channel differs from
 * every existing swatch by more than this. 16 keeps #111-step ramps distinct
 * and collapses picker noise and near-duplicate shades.
 */
export const PALETTE_NEW_COLOR_DISTANCE = 16;

export type PaletteColor = {
  hex: string;
  lastUsedAt: number;
  source: PaletteSource;
};

/** Lowercase `#rrggbb`. Semi-transparent input keeps the base RGB; fully transparent is rejected. */
export function canonicalizePaletteHex(hex: string): string | null {
  const raw = hex.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    if (raw.slice(6, 8).toLowerCase() === "00") {
      return null;
    }
    return `#${raw.slice(0, 6).toLowerCase()}`;
  }

  return null;
}

function channelDistance(a: string, b: string): number {
  const delta = (offset: number) =>
    Math.abs(Number.parseInt(a.slice(offset, offset + 2), 16) - Number.parseInt(b.slice(offset, offset + 2), 16));
  return Math.max(delta(1), delta(3), delta(5));
}

/** Dedup by hex, collapse near shades, and evict the least recently used entries past `maxColors`. */
export function insertPaletteColor(
  colors: readonly PaletteColor[],
  hex: string,
  source: PaletteSource,
  maxColors: number,
  now = Date.now(),
): PaletteColor[] {
  const canonical = canonicalizePaletteHex(hex);
  if (!canonical || maxColors < 1) {
    return colors as PaletteColor[];
  }

  let nearest = colors[0];
  let nearestDistance = nearest ? channelDistance(canonical, nearest.hex) : Number.POSITIVE_INFINITY;
  for (let index = 1; index < colors.length; index += 1) {
    const color = colors[index]!;
    const distance = channelDistance(canonical, color.hex);
    if (distance < nearestDistance) {
      nearest = color;
      nearestDistance = distance;
    }
  }

  const matched = nearest && nearestDistance <= PALETTE_NEW_COLOR_DISTANCE ? nearest : undefined;
  const next: PaletteColor[] = [
    ...colors.filter((color) => color.hex !== matched?.hex),
    {
      hex: matched?.hex ?? canonical,
      lastUsedAt: now,
      source: matched?.source ?? source,
    },
  ];

  if (next.length <= maxColors) {
    return next;
  }

  return next.slice(next.length - maxColors);
}
