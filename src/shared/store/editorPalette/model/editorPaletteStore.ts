import { create } from "zustand";
import { insertPaletteColor, type PaletteSource } from "./paletteColor";
import type { EditorPaletteState } from "./types";

export const MAX_PALETTE_COLORS = 64;

export const useEditorPaletteStore = create<EditorPaletteState>((set, get) => ({
  colors: [],
  maxColors: MAX_PALETTE_COLORS,

  addColor: (hex, source) => {
    const state = get();
    const next = insertPaletteColor(state.colors, hex, source, state.maxColors);
    if (next === state.colors) {
      return false;
    }
    set({ colors: next });
    return true;
  },

  mergeColors: (hexes, source) => {
    if (hexes.length === 0) {
      return;
    }
    const state = get();
    let colors = state.colors;
    let now = Date.now();
    for (const hex of hexes) {
      const next = insertPaletteColor(colors, hex, source, state.maxColors, now);
      if (next !== colors) {
        colors = next;
        now += 1;
      }
    }
    if (colors !== state.colors) {
      set({ colors });
    }
  },

  clearColors: () => {
    if (get().colors.length === 0) {
      return;
    }
    set({ colors: [] });
  },
}));

export function __resetEditorPaletteStoreForTests(partial?: {
  maxColors?: number;
}): void {
  useEditorPaletteStore.setState({
    colors: [],
    maxColors: partial?.maxColors ?? MAX_PALETTE_COLORS,
  });
}

export type { PaletteSource };
