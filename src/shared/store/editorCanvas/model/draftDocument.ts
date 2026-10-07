import { clampDurationMs } from "@/shared/pixelObject/manifest";
import type { EditorFrame, FrameId } from "./frames";
import { isBlendMode } from "./layerFactory";
import type { BlendMode, EditorLayer, LayerId } from "./layerTypes";
import { clonePixels } from "./pixels";

export type EditorDraftLayer = {
  id: LayerId;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
};

export type EditorDraftFrame = {
  id: FrameId;
  durationMs: number;
  cels: Record<LayerId, { pixels: Uint8ClampedArray<ArrayBuffer> }>;
};

/** Serializable editor document. Undo stacks stay in memory and are not stored. */
export type EditorDraftSnapshot = {
  width: number;
  height: number;
  layers: EditorDraftLayer[];
  activeLayerId: LayerId;
  frames: EditorDraftFrame[];
  activeFrameId: FrameId;
  primaryColor: string;
  secondaryColor: string;
  onionSkin: boolean;
};

export type DraftDocumentSource = {
  width: number;
  height: number;
  layers: readonly EditorLayer[];
  activeLayerId: LayerId;
  frames: readonly EditorFrame[];
  activeFrameId: FrameId;
  primaryColor: string;
  secondaryColor: string;
  onionSkin: boolean;
};

export function captureEditorDraft(state: DraftDocumentSource): EditorDraftSnapshot {
  return {
    width: state.width,
    height: state.height,
    layers: state.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: isBlendMode(layer.blendMode) ? layer.blendMode : "normal",
    })),
    activeLayerId: state.activeLayerId,
    activeFrameId: state.activeFrameId,
    frames: state.frames.map((frame) => ({
      id: frame.id,
      durationMs: clampDurationMs(frame.durationMs),
      cels: Object.fromEntries(
        Object.entries(frame.cels).map(([id, cel]) => [id, { pixels: clonePixels(cel.pixels) }]),
      ),
    })),
    primaryColor: state.primaryColor,
    secondaryColor: state.secondaryColor,
    onionSkin: state.onionSkin,
  };
}

export function maxNumericId(ids: readonly string[], prefix: string): number {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const id of ids) {
    const match = pattern.exec(id);
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max;
}
