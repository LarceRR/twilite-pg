/** Select-tool catalog + sticky boolean modes (runtime lives in selectionMask / store). */

export const SELECTION_TOOLS = ["rect", "ellipse", "lasso", "wand"] as const;
export type SelectionTool = (typeof SELECTION_TOOLS)[number];

export const SELECTION_TOOL_LABELS: Record<SelectionTool, string> = {
  rect: "Прямоугольник",
  ellipse: "Круг",
  lasso: "Лассо",
  wand: "Палочка",
};

/** Sticky / effective boolean ops — Intersect out of scope v1. */
export const SELECTION_OP_MODES = ["replace", "add", "subtract"] as const;
export type SelectionOpMode = (typeof SELECTION_OP_MODES)[number];

export const SELECTION_OP_MODE_LABELS: Record<SelectionOpMode, string> = {
  replace: "Заменить",
  add: "Добавить",
  subtract: "Вычесть",
};

/** Photoshop default Magic Wand tolerance (UI default only). */
export const WAND_DEFAULT_TOLERANCE = 32;

export type SelectionDraft =
  | {
      kind: "rect";
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      constrainSquare: boolean;
      /** Effective boolean latched at pointerDown. */
      opMode: SelectionOpMode;
      nudgeDx?: number;
      nudgeDy?: number;
    }
  | {
      kind: "ellipse";
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      constrainCircle: boolean;
      opMode: SelectionOpMode;
      nudgeDx?: number;
      nudgeDy?: number;
    }
  | {
      kind: "lasso";
      points: Array<{ x: number; y: number }>;
      opMode: SelectionOpMode;
    };

export type FloatTransform = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

export type FloatSession = {
  /** RGBA of the immutable source cut-out (bbox footprint). */
  pixels: Uint8ClampedArray;
  /** Binary mask same size as pixels footprint (w×h). */
  mask: Uint8Array;
  width: number;
  height: number;
  transform: FloatTransform;
  baseLayerSnapshot: Uint8ClampedArray;
  /** Mask before cut-out / paste — restored on cancel. `null` = Idle. */
  baseMaskSnapshot: Uint8Array | null;
  sourceLayerId: string;
  sourceFrameId: string;
};

export type SelectionClipboard = {
  pixels: Uint8ClampedArray;
  mask: Uint8Array;
  width: number;
  height: number;
};

export type SelectionModifiers = {
  shift: boolean;
  alt: boolean;
};

/**
 * Resolve sticky flyout mode + pointer modifiers into the effective stroke mode
 * and whether rect/ellipse should constrain to square/circle.
 * Spec: docs/editor/selection/05-boolean-modes.md
 */
export function resolveSelectionStroke(
  sticky: SelectionOpMode,
  hasMask: boolean,
  modifiers: SelectionModifiers,
): { effective: SelectionOpMode; constrainSquareOrCircle: boolean } {
  let effective: SelectionOpMode;
  if (modifiers.alt) {
    effective = "subtract";
  } else if (modifiers.shift && (hasMask || sticky === "add")) {
    effective = "add";
  } else {
    effective = sticky;
  }

  const constrainSquareOrCircle =
    modifiers.shift &&
    sticky === "replace" &&
    !hasMask &&
    effective === "replace";

  return { effective, constrainSquareOrCircle };
}
