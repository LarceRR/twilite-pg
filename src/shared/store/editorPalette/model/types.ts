import type { PaletteColor, PaletteSource } from "./paletteColor";

export type { PaletteColor, PaletteSource } from "./paletteColor";

export interface EditorPaletteState {
  colors: PaletteColor[];
  maxColors: number;
  addColor: (hex: string, source: PaletteSource) => boolean;
  mergeColors: (hexes: readonly string[], source: PaletteSource) => void;
  clearColors: () => void;
}
