import { createEmptyPixels, clonePixels } from "./pixels";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import type { BlendMode, EditorLayer, LayerId } from "./layerTypes";

let layerSeq = 1;

export function createLayerId(): LayerId {
  const id = `layer-${layerSeq}`;
  layerSeq += 1;
  return id;
}

/** Test helper — reset id counter. */
export function resetLayerIdSequence(next = 1): void {
  layerSeq = next;
}

export function createLayer(options?: {
  id?: LayerId;
  name?: string;
  width?: number;
  height?: number;
  pixels?: Uint8ClampedArray<ArrayBuffer>;
}): EditorLayer {
  const width = options?.width ?? CANVAS_WIDTH;
  const height = options?.height ?? CANVAS_HEIGHT;
  const id = options?.id ?? createLayerId();

  return {
    id,
    name: options?.name ?? `Слой ${id.replace("layer-", "")}`,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    pixels: options?.pixels ?? createEmptyPixels(width, height),
    undoStack: [],
    redoStack: [],
  };
}

export function cloneLayer(layer: EditorLayer): EditorLayer {
  return {
    ...layer,
    pixels: clonePixels(layer.pixels),
    undoStack: layer.undoStack.map((snap) => clonePixels(snap)),
    redoStack: layer.redoStack.map((snap) => clonePixels(snap)),
  };
}

export function isLayerDrawable(layer: EditorLayer | undefined): boolean {
  return Boolean(layer && layer.visible && !layer.locked);
}

export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

export function isBlendMode(value: string): value is BlendMode {
  return (
    value === "normal" ||
    value === "multiply" ||
    value === "screen" ||
    value === "overlay" ||
    value === "add" ||
    value === "subtract"
  );
}
