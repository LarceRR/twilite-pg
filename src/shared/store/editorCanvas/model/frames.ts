import { clampDurationMs } from "@/shared/pixelObject/manifest";
import { hasOpaquePixel } from "@/shared/pixelObject/pixels";
import { DEFAULT_FRAME_DURATION_MS } from "@/shared/pixelObject/constants";
import { compositeLayers } from "./composite";
import type { EditorLayer, LayerId } from "./layerTypes";
import { clonePixels, createEmptyPixels } from "./pixels";

export type FrameId = string;

/** Pixel snapshot of one layer inside one frame. Undo stays on that cel. */
export type FrameCel = {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  undoStack: Uint8ClampedArray<ArrayBuffer>[];
  redoStack: Uint8ClampedArray<ArrayBuffer>[];
};

export type EditorFrame = {
  id: FrameId;
  durationMs: number;
  cels: Record<LayerId, FrameCel>;
};

let frameSeq = 1;

export function createFrameId(): FrameId {
  const id = `frame-${frameSeq}`;
  frameSeq += 1;
  return id;
}

export function resetFrameIdSequence(next = 1): void {
  frameSeq = next;
}

export function shareCel(layer: Pick<EditorLayer, "pixels" | "undoStack" | "redoStack">): FrameCel {
  return {
    pixels: layer.pixels,
    undoStack: layer.undoStack,
    redoStack: layer.redoStack,
  };
}

export function emptyCel(width: number, height: number): FrameCel {
  return {
    pixels: createEmptyPixels(width, height),
    undoStack: [],
    redoStack: [],
  };
}

/** Active frame shares the live layer buffers. */
export function createFrameFromLayers(
  layers: readonly EditorLayer[],
  durationMs = DEFAULT_FRAME_DURATION_MS,
): EditorFrame {
  const cels: Record<LayerId, FrameCel> = {};
  for (const layer of layers) {
    cels[layer.id] = shareCel(layer);
  }
  return {
    id: createFrameId(),
    durationMs: clampDurationMs(durationMs),
    cels,
  };
}

/** Copy pixels into a new frame. The copy starts with empty undo stacks. */
export function cloneFrame(frame: EditorFrame): EditorFrame {
  const cels: Record<LayerId, FrameCel> = {};
  for (const [id, cel] of Object.entries(frame.cels)) {
    cels[id] = {
      pixels: clonePixels(cel.pixels),
      undoStack: [],
      redoStack: [],
    };
  }
  return {
    id: createFrameId(),
    durationMs: frame.durationMs,
    cels,
  };
}

export function projectFrame(
  layers: readonly EditorLayer[],
  frame: EditorFrame,
  width: number,
  height: number,
): EditorLayer[] {
  return layers.map((layer) => {
    const cel = frame.cels[layer.id] ?? emptyCel(width, height);
    return {
      ...layer,
      pixels: cel.pixels,
      undoStack: cel.undoStack,
      redoStack: cel.redoStack,
    };
  });
}

/** Point the active frame at the live layer buffers. Other frames stay as stored. */
export function syncActiveFrameCels(
  frames: readonly EditorFrame[],
  activeFrameId: FrameId,
  layers: readonly EditorLayer[],
): EditorFrame[] {
  return frames.map((frame) => {
    if (frame.id !== activeFrameId) {
      return frame;
    }
    const cels: Record<LayerId, FrameCel> = {};
    for (const layer of layers) {
      cels[layer.id] = shareCel(layer);
    }
    return { ...frame, cels };
  });
}

export function bindDocument<
  T extends {
    layers?: EditorLayer[];
    frames?: EditorFrame[];
    activeFrameId?: FrameId;
  },
>(state: { layers: EditorLayer[]; frames: EditorFrame[]; activeFrameId: FrameId }, next: T): T {
  if (next.layers === undefined && next.frames === undefined && next.activeFrameId === undefined) {
    return next;
  }
  const layers = next.layers ?? state.layers;
  const activeFrameId = next.activeFrameId ?? state.activeFrameId;
  const frames = syncActiveFrameCels(next.frames ?? state.frames, activeFrameId, layers);
  return { ...next, frames };
}

/** Attach a layer cel. The active frame uses `activeCel`; other frames get an empty cel. */
export function withLayerCel(
  frames: readonly EditorFrame[],
  activeFrameId: FrameId,
  layerId: LayerId,
  activeCel: FrameCel,
  width: number,
  height: number,
): EditorFrame[] {
  return frames.map((frame) => ({
    ...frame,
    cels: {
      ...frame.cels,
      [layerId]:
        frame.id === activeFrameId ? activeCel : (frame.cels[layerId] ?? emptyCel(width, height)),
    },
  }));
}

export function withoutLayer(frames: readonly EditorFrame[], layerId: LayerId): EditorFrame[] {
  return frames.map((frame) => {
    if (!(layerId in frame.cels)) {
      return frame;
    }
    const cels = { ...frame.cels };
    delete cels[layerId];
    return { ...frame, cels };
  });
}

export function duplicateLayerCels(
  frames: readonly EditorFrame[],
  sourceId: LayerId,
  nextId: LayerId,
  width: number,
  height: number,
  activeFrameId: FrameId,
): { frames: EditorFrame[]; activePixels: Uint8ClampedArray<ArrayBuffer> } {
  let activePixels = createEmptyPixels(width, height);
  const nextFrames = frames.map((frame) => {
    const source = frame.cels[sourceId];
    const pixels = source ? clonePixels(source.pixels) : createEmptyPixels(width, height);
    if (frame.id === activeFrameId) {
      activePixels = pixels;
    }
    return {
      ...frame,
      cels: {
        ...frame.cels,
        [nextId]: { pixels, undoStack: [], redoStack: [] },
      },
    };
  });
  return { frames: nextFrames, activePixels };
}

export function compositeFrame(
  layers: readonly EditorLayer[],
  frame: EditorFrame,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  return compositeLayers(
    layers.map((layer) => ({
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      pixels: frame.cels[layer.id]?.pixels ?? createEmptyPixels(width, height),
    })),
    width,
    height,
  );
}

export function documentHasOpaquePixel(state: {
  layers: readonly EditorLayer[];
  frames: readonly EditorFrame[];
  width: number;
  height: number;
}): boolean {
  return state.frames.some((frame) =>
    hasOpaquePixel(compositeFrame(state.layers, frame, state.width, state.height)),
  );
}
