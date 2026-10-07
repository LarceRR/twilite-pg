export const CANVAS_WIDTH = 70;
export const CANVAS_HEIGHT = 70;

/** Longest side a document may adopt from an import. */
export const MAX_DOCUMENT_EDGE = 1024;
export const CANVAS_PIXEL_COUNT = CANVAS_WIDTH * CANVAS_HEIGHT;
export const CANVAS_BYTE_LENGTH = CANVAS_PIXEL_COUNT * 4;

/** Max layers in one document. */
export const MAX_LAYERS = 16;
/** Undo snapshots kept per layer. */
export const MAX_LAYER_UNDO_STEPS = 30;

/** @deprecated Use MAX_LAYER_UNDO_STEPS */
export const MAX_UNDO_STEPS = MAX_LAYER_UNDO_STEPS;

export const DEFAULT_PRIMARY_COLOR = "#000000";
export const DEFAULT_SECONDARY_COLOR = "#ffffff";

export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "add",
  "subtract",
] as const;
