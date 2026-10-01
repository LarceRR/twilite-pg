import type { GeneratedThemeDto } from "@/shared/api/appThemes";

const STORAGE_KEY = "tpg.themeSaved";

export type SavedLocalTheme = GeneratedThemeDto & {
  readonly localId: string;
  readonly savedAt: string;
};

export function loadSavedThemes(): SavedLocalTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as SavedLocalTheme[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedThemes(themes: readonly SavedLocalTheme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

export function saveLocalTheme(theme: GeneratedThemeDto): SavedLocalTheme {
  const entry: SavedLocalTheme = {
    ...theme,
    localId: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...loadSavedThemes()];
  persistSavedThemes(next);
  return entry;
}

export function removeLocalTheme(localId: string): void {
  persistSavedThemes(loadSavedThemes().filter((theme) => theme.localId !== localId));
}
