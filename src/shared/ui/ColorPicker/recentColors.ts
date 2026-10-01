import { normalizeHex } from "./colorMath";

export const RECENT_COLORS_MAX = 20;
export const DEFAULT_RECENT_STORAGE_KEY = "twilite-color-picker-recent";

/** Most recent first. Dedupes by normalized hex. */
export function pushRecentColor(colors: readonly string[], hex: string, max = RECENT_COLORS_MAX): string[] {
  const canonical = normalizeHex(hex);
  const without = colors.filter((entry) => normalizeHex(entry) !== canonical);
  const next = [canonical, ...without];
  if (next.length <= max) {
    return next;
  }
  return next.slice(0, max);
}

export function loadRecentColors(storageKey: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "string") {
        continue;
      }
      const hex = normalizeHex(entry);
      if (hex === "#000000" && entry.trim() !== "#000000" && entry.trim() !== "000000") {
        continue;
      }
      if (!out.includes(hex)) {
        out.push(hex);
      }
      if (out.length >= RECENT_COLORS_MAX) {
        break;
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function saveRecentColors(storageKey: string, colors: readonly string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(colors.slice(0, RECENT_COLORS_MAX)));
  } catch {
    // Quota or private mode — ignore.
  }
}
