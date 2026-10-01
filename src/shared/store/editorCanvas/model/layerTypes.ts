import type { BLEND_MODES } from "./constants";

export type BlendMode = (typeof BLEND_MODES)[number];

export type LayerId = string;

export type EditorLayer = {
  id: LayerId;
  name: string;
  visible: boolean;
  locked: boolean;
  /** 0..1 */
  opacity: number;
  blendMode: BlendMode;
  pixels: Uint8ClampedArray<ArrayBuffer>;
  undoStack: Uint8ClampedArray<ArrayBuffer>[];
  redoStack: Uint8ClampedArray<ArrayBuffer>[];
};

/** Minimal layer fields needed for compositing. */
export type CompositeLayerInput = Pick<
  EditorLayer,
  "visible" | "opacity" | "blendMode" | "pixels"
>;
