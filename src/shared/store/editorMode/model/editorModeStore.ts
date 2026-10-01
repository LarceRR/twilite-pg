import { create } from "zustand";
import type { EditorModeState } from "./types";

export const useEditorModeStore = create<EditorModeState>((set) => ({
  editorMode: false,
  setEditorMode: (editorMode) => set({ editorMode }),
}));
