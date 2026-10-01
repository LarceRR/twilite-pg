export function clampToolAmount(value: number, min: number, max: number): number {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin;
  const lo = Math.min(safeMin, safeMax);
  const hi = Math.max(safeMin, safeMax);

  if (!Number.isFinite(value)) {
    return lo;
  }

  return Math.min(hi, Math.max(lo, value));
}

export function parseToolAmount(
  raw: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const trimmed = raw.trim().replace(",", ".");

  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return fallback;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampToolAmount(parsed, min, max);
}
