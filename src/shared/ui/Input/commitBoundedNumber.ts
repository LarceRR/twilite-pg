const INCOMPLETE = new Set(["", "-", ".", "-."]);
const COMPLETE_NUMBER = /^-?\d+(?:\.\d+)?$/;

function orderedBounds(min?: number, max?: number): { lo?: number; hi?: number } {
  const hasMin = typeof min === "number" && Number.isFinite(min);
  const hasMax = typeof max === "number" && Number.isFinite(max);
  if (hasMin && hasMax && min > max) {
    return { lo: max, hi: min };
  }
  return {
    lo: hasMin ? min : undefined,
    hi: hasMax ? max : undefined,
  };
}

function normalizeRaw(raw: string): string {
  return raw.trim().replace(",", ".");
}

/** A finished number inside the range. Prefixes like "5" of "50" return null. */
export function parseInRange(raw: string, min?: number, max?: number): number | null {
  const trimmed = normalizeRaw(raw);
  if (!COMPLETE_NUMBER.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const { lo, hi } = orderedBounds(min, max);
  if (lo !== undefined && parsed < lo) {
    return null;
  }
  if (hi !== undefined && parsed > hi) {
    return null;
  }
  return parsed;
}

/**
 * Value to store when editing finishes.
 * Empty or unfinished text returns null so the caller keeps the previous value.
 * A finished number is clamped into range.
 */
export function commitBoundedNumber(
  raw: string,
  min?: number,
  max?: number,
): number | null {
  const trimmed = normalizeRaw(raw);
  if (INCOMPLETE.has(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const { lo, hi } = orderedBounds(min, max);
  let next = parsed;
  if (lo !== undefined) {
    next = Math.max(lo, next);
  }
  if (hi !== undefined) {
    next = Math.min(hi, next);
  }
  return next;
}
