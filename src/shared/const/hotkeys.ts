/** Central app shortcut ids — add new chords here, wire with useHotkey. */
export const APP_HOTKEYS = {
  OPEN_SEARCH: "Mod+K",
  CLOSE_OVERLAY: "Escape",
  UNDO: "Mod+Z",
  REDO: "Mod+Shift+Z",
  REDO_ALT: "Mod+Y",
  SWAP_COLORS: "X",
  SELECT_FILL: "G",
  PREV_FRAME: "ArrowLeft",
  NEXT_FRAME: "ArrowRight",
  SELECT_ALL: "Mod+A",
  DESELECT: "Mod+D",
  COPY: "Mod+C",
  CUT: "Mod+X",
  PASTE: "Mod+V",
  DELETE_SELECTION: "Delete",
  COMMIT_FLOAT: "Enter",
  NUDGE_UP: "ArrowUp",
  NUDGE_DOWN: "ArrowDown",
} as const;

export type AppHotkeyId = keyof typeof APP_HOTKEYS;
