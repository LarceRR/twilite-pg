import { create } from "zustand";
import { DEFAULT_FRAME_DURATION_MS, MAX_FRAMES } from "@/shared/pixelObject/constants";
import { clampDurationMs } from "@/shared/pixelObject/manifest";
import { DEFAULT_BRUSH_SHAPE } from "./brushShapes";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  MAX_DOCUMENT_EDGE,
  MAX_LAYERS,
  MAX_LAYER_UNDO_STEPS,
} from "./constants";
import { compositeLayers } from "./composite";
import { floodFill } from "./floodFill";
import {
  bindDocument,
  cloneFrame,
  compositeFrame,
  createFrameFromLayers,
  createFrameId,
  documentHasOpaquePixel,
  type EditorFrame,
  duplicateLayerCels,
  emptyCel,
  projectFrame,
  resetFrameIdSequence,
  shareCel,
  withLayerCel,
  withoutLayer,
} from "./frames";
import { maxNumericId, type EditorDraftSnapshot } from "./draftDocument";
import {
  clampOpacity,
  createLayer,
  isBlendMode,
  isLayerDrawable,
  resetLayerIdSequence,
} from "./layerFactory";
import {
  clonePixels,
  createEmptyPixels,
  stampSegmentIntoCoverage,
} from "./pixels";
import {
  applyStrokeSessionToLayer,
  createStrokeSession,
  stampStrokeAt,
  type StrokeSession,
} from "./strokeCoverage";
import {
  WAND_DEFAULT_TOLERANCE,
  type FloatTransform,
  type SelectionDraft,
  type SelectionOpMode,
  type SelectionTool,
} from "./selection";
import {
  beginSelectionDraftInState,
  cancelFloatInState,
  cancelSelectionDraft,
  commitFloatInState,
  commitSelectionDraftInState,
  copySelectionInState,
  cutSelectionInState,
  deleteSelectionInState,
  deselectSelection,
  pasteClipboardInState,
  selectAllSelection,
  startFloatFromSelectionInState,
  updateFloatTransformInState,
  updateSelectionDraftInState,
} from "./selectionRuntime";
import type { BlendMode, EditorLayer, LayerId } from "./layerTypes";
import type { EditorCanvasState, FillResult, ImportPixelsTarget, LayerOpResult } from "./types";

let activeStroke: StrokeSession | null = null;
let redoStackBeforeStroke: EditorLayer["redoStack"] | null = null;

function pushLayerUndo(layer: EditorLayer): EditorLayer {
  const undoStack = [...layer.undoStack, clonePixels(layer.pixels)];
  const trimmed =
    undoStack.length > MAX_LAYER_UNDO_STEPS
      ? undoStack.slice(undoStack.length - MAX_LAYER_UNDO_STEPS)
      : undoStack;
  return { ...layer, undoStack: trimmed, redoStack: [] };
}

function mapLayer(
  layers: EditorLayer[],
  id: LayerId,
  mapper: (layer: EditorLayer) => EditorLayer,
): EditorLayer[] {
  return layers.map((layer) => (layer.id === id ? mapper(layer) : layer));
}

function findLayer(layers: EditorLayer[], id: LayerId): EditorLayer | undefined {
  return layers.find((layer) => layer.id === id);
}

function bump(revision: number): number {
  return revision + 1;
}

/** When a selection mask is active, paint/erase only where mask == 1. */
function clipCoverageToSelectionMask(
  coverage: Uint8Array,
  selectionMask: Uint8Array | null,
): void {
  if (!selectionMask) return;
  for (let i = 0; i < coverage.length; i++) {
    if (selectionMask[i]! === 0) {
      coverage[i] = 0;
    }
  }
}

function buffersDiffer(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return true;
    }
  }
  return false;
}

function nextImportLayerName(layers: readonly { name: string }[]): string {
  let max = 0;
  for (const layer of layers) {
    const match = /^Import (\d+)$/.exec(layer.name);
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      max = Math.max(max, value);
    }
  }
  return `Import ${max + 1}`;
}

function nextStoryboardLayerName(layers: readonly { name: string }[]): string {
  let max = 0;
  let hasPlain = false;
  for (const layer of layers) {
    if (layer.name === "Раскадровка") {
      hasPlain = true;
      max = Math.max(max, 1);
      continue;
    }
    const match = /^Раскадровка (\d+)$/.exec(layer.name);
    if (!match) {
      continue;
    }
    hasPlain = true;
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      max = Math.max(max, value);
    }
  }
  if (!hasPlain) {
    return "Раскадровка";
  }
  return `Раскадровка ${max + 1}`;
}

function storyboardFrameFromPixels(
  layerId: LayerId,
  pixels: Uint8ClampedArray,
  durationMs: number,
): import("./frames").EditorFrame {
  return {
    id: createFrameId(),
    durationMs: clampDurationMs(durationMs),
    cels: {
      [layerId]: {
        pixels: clonePixels(pixels),
        undoStack: [],
        redoStack: [],
      },
    },
  };
}

const initialLayer = createLayer({ name: "Слой 1" });
const initialFrame = createFrameFromLayers([initialLayer]);

const PLAYBACK_BLOCK = "Остановите воспроизведение";

export const useEditorCanvasStore = create<EditorCanvasState>((rawSet, get) => {
  const set: typeof rawSet = (partial, replace) => {
    if (replace === true) {
      rawSet(partial as EditorCanvasState, true);
      return;
    }
    rawSet((state) => {
      const next =
        typeof partial === "function"
          ? (partial as (state: EditorCanvasState) => Partial<EditorCanvasState>)(state)
          : partial;
      return bindDocument(state, next);
    });
  };

  return {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  layers: [initialLayer],
  activeLayerId: initialLayer.id,
  frames: [initialFrame],
  activeFrameId: initialFrame.id,
  onionSkin: false,
  isPlaying: false,
  revision: 0,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
  isDrawing: false,
  selectionTool: "rect",
  selectionOpMode: "replace",
  selectionMask: null,
  selectionDraft: null,
  floatSession: null,
  selectionClipboard: null,
  lastPasteOrigin: null,
  wandTolerance: WAND_DEFAULT_TOLERANCE,
  wandContiguous: true,
  wandSampleAllLayers: true,

  setPrimaryColor: (hex) => set({ primaryColor: hex }),
  setSecondaryColor: (hex) => set({ secondaryColor: hex }),
  swapColors: () =>
    set((state) => ({
      primaryColor: state.secondaryColor,
      secondaryColor: state.primaryColor,
    })),

  getActiveLayer: () => findLayer(get().layers, get().activeLayerId),

  isActiveLayerDrawable: () => isLayerDrawable(get().getActiveLayer()),

  getActiveUndoDepth: () => get().getActiveLayer()?.undoStack.length ?? 0,
  getActiveRedoDepth: () => get().getActiveLayer()?.redoStack.length ?? 0,
  canUndo: () =>
    (get().getActiveUndoDepth() > 0 || get().floatSession != null) &&
    !get().isDrawing &&
    !get().isPlaying,
  canRedo: () => get().getActiveRedoDepth() > 0 && !get().isDrawing && !get().isPlaying,

  addLayer: (): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед добавлением слоя" };
    }
    if (state.layers.length >= MAX_LAYERS) {
      return { ok: false, reason: `Максимум ${MAX_LAYERS} слоёв` };
    }
    const layer = createLayer({ name: `Слой ${state.layers.length + 1}` });
    set({
      layers: [...state.layers, layer],
      frames: withLayerCel(
        state.frames,
        state.activeFrameId,
        layer.id,
        shareCel(layer),
        state.width,
        state.height,
      ),
      activeLayerId: layer.id,
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  deleteLayer: (id): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед удалением слоя" };
    }
    if (state.layers.length <= 1) {
      return { ok: false, reason: "Нельзя удалить последний слой" };
    }
    if (!findLayer(state.layers, id)) {
      return { ok: false, reason: "Слой не найден" };
    }
    const layers = state.layers.filter((layer) => layer.id !== id);
    const activeLayerId =
      state.activeLayerId === id ? layers[layers.length - 1]!.id : state.activeLayerId;
    set({
      layers,
      frames: withoutLayer(state.frames, id),
      activeLayerId,
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  duplicateLayer: (id): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед дублированием" };
    }
    if (state.layers.length >= MAX_LAYERS) {
      return { ok: false, reason: `Максимум ${MAX_LAYERS} слоёв` };
    }
    const source = findLayer(state.layers, id);
    if (!source) {
      return { ok: false, reason: "Слой не найден" };
    }
    const copy = createLayer({
      name: `${source.name} копия`,
    });
    const seeded = duplicateLayerCels(
      state.frames,
      source.id,
      copy.id,
      state.width,
      state.height,
      state.activeFrameId,
    );
    copy.pixels = seeded.activePixels;
    copy.visible = source.visible;
    copy.locked = source.locked;
    copy.opacity = source.opacity;
    copy.blendMode = source.blendMode;

    const index = state.layers.findIndex((layer) => layer.id === id);
    const layers = [
      ...state.layers.slice(0, index + 1),
      copy,
      ...state.layers.slice(index + 1),
    ];
    set({
      layers,
      frames: seeded.frames,
      activeLayerId: copy.id,
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  setActiveLayer: (id): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед сменой слоя" };
    }
    if (!findLayer(state.layers, id)) {
      return { ok: false, reason: "Слой не найден" };
    }
    if (state.activeLayerId === id) {
      return { ok: true };
    }
    if (state.floatSession) {
      get().commitFloat();
    }
    set({ activeLayerId: id });
    return { ok: true };
  },

  reorderLayer: (fromIndex, toIndex): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед перестановкой" };
    }
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= state.layers.length ||
      toIndex >= state.layers.length ||
      fromIndex === toIndex
    ) {
      return { ok: false, reason: "Некорректные индексы" };
    }
    const layers = [...state.layers];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved!);
    set({ layers, revision: bump(state.revision) });
    return { ok: true };
  },

  setLayerVisibility: (id, visible) => {
    set((state) => ({
      layers: mapLayer(state.layers, id, (layer) => ({ ...layer, visible })),
      revision: bump(state.revision),
    }));
  },

  setLayerLocked: (id, locked) => {
    set((state) => ({
      layers: mapLayer(state.layers, id, (layer) => ({ ...layer, locked })),
    }));
  },

  setLayerOpacity: (id, opacity) => {
    set((state) => ({
      layers: mapLayer(state.layers, id, (layer) => ({
        ...layer,
        opacity: clampOpacity(opacity),
      })),
      revision: bump(state.revision),
    }));
  },

  setLayerBlendMode: (id, blendMode) => {
    if (!isBlendMode(blendMode)) {
      return;
    }
    set((state) => ({
      layers: mapLayer(state.layers, id, (layer) => ({ ...layer, blendMode })),
      revision: bump(state.revision),
    }));
  },

  renameLayer: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    set((state) => ({
      layers: mapLayer(state.layers, id, (layer) => ({ ...layer, name: trimmed })),
    }));
  },

  addFrame: (): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед добавлением кадра" };
    }
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    if (state.frames.length >= MAX_FRAMES) {
      return { ok: false, reason: `Максимум ${MAX_FRAMES} кадров` };
    }
    const current = state.frames.find((frame) => frame.id === state.activeFrameId);
    if (!current) {
      return { ok: false, reason: "Кадр не найден" };
    }
    const created = cloneFrame(current);
    const index = state.frames.findIndex((frame) => frame.id === current.id);
    const frames = [
      ...state.frames.slice(0, index + 1),
      created,
      ...state.frames.slice(index + 1),
    ];
    set({
      frames,
      layers: projectFrame(state.layers, created, state.width, state.height),
      activeFrameId: created.id,
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  deleteFrame: (id): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед удалением кадра" };
    }
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    if (state.frames.length <= 1) {
      return { ok: false, reason: "Нельзя удалить последний кадр" };
    }
    const index = state.frames.findIndex((frame) => frame.id === id);
    if (index < 0) {
      return { ok: false, reason: "Кадр не найден" };
    }
    const frames = state.frames.filter((frame) => frame.id !== id);
    const removingActive = state.activeFrameId === id;
    const next = frames[Math.min(index, frames.length - 1)]!;
    set({
      frames,
      ...(removingActive
        ? {
            activeFrameId: next.id,
            layers: projectFrame(state.layers, next, state.width, state.height),
          }
        : {}),
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  setActiveFrame: (id, options): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед сменой кадра" };
    }
    const frame = state.frames.find((item) => item.id === id);
    if (!frame) {
      return { ok: false, reason: "Кадр не найден" };
    }
    if (frame.id === state.activeFrameId) {
      return { ok: true };
    }
    if (state.floatSession) {
      get().commitFloat();
    }
    const afterCommit = get();
    set({
      layers: projectFrame(afterCommit.layers, frame, afterCommit.width, afterCommit.height),
      activeFrameId: frame.id,
      isPlaying: options?.keepPlaying ? afterCommit.isPlaying : false,
      revision: bump(afterCommit.revision),
    });
    return { ok: true };
  },

  moveFrame: (offset): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед перестановкой кадра" };
    }
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    const index = state.frames.findIndex((frame) => frame.id === state.activeFrameId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= state.frames.length) {
      return { ok: false, reason: "Кадр уже с краю" };
    }
    const frames = [...state.frames];
    const [moved] = frames.splice(index, 1);
    frames.splice(target, 0, moved!);
    set({ frames, revision: bump(state.revision) });
    return { ok: true };
  },

  reorderFrame: (fromIndex, toIndex): LayerOpResult => {
    const state = get();
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед перестановкой кадра" };
    }
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= state.frames.length ||
      toIndex >= state.frames.length
    ) {
      return { ok: false, reason: "Некорректные индексы" };
    }
    if (fromIndex === toIndex) {
      return { ok: true };
    }
    const frames = [...state.frames];
    const [moved] = frames.splice(fromIndex, 1);
    frames.splice(toIndex, 0, moved!);
    set({ frames, revision: bump(state.revision) });
    return { ok: true };
  },

  setFrameDuration: (id, durationMs) => {
    set((state) => ({
      frames: state.frames.map((frame) =>
        frame.id === id ? { ...frame, durationMs: clampDurationMs(durationMs) } : frame,
      ),
    }));
  },

  playPreview: () => {
    if (get().isDrawing) {
      return;
    }
    if (get().floatSession) {
      get().commitFloat();
    }
    set({ isPlaying: true });
  },

  pausePlayback: () => {
    if (!get().isPlaying) {
      return;
    }
    set({ isPlaying: false });
  },

  toggleOnionSkin: () => {
    set((state) => ({ onionSkin: !state.onionSkin }));
  },

  getNeighborComposite: (offset) => {
    const state = get();
    if (!state.onionSkin || (offset !== -1 && offset !== 1)) {
      return null;
    }
    const index = state.frames.findIndex((frame) => frame.id === state.activeFrameId);
    const neighbor = state.frames[index + offset];
    if (!neighbor) {
      return null;
    }
    return compositeFrame(state.layers, neighbor, state.width, state.height);
  },

  hasOpaqueDocument: () => documentHasOpaquePixel(get()),

  beginStroke: (options) => {
    const state = get();
    if (state.isPlaying || state.isDrawing || activeStroke) {
      return false;
    }
    const active = findLayer(state.layers, state.activeLayerId);
    if (!isLayerDrawable(active)) {
      return false;
    }
    activeStroke = createStrokeSession(state.width, state.height, active!.pixels, {
      rgba: options.rgba,
      mode: options.mode ?? "paint",
      shape: options.shape ?? DEFAULT_BRUSH_SHAPE,
      size: options.size,
      softness: options.softness ?? 0,
    });
    redoStackBeforeStroke = [...active!.redoStack];
    set({
      isDrawing: true,
      layers: mapLayer(state.layers, active!.id, pushLayerUndo),
    });
    return true;
  },

  endStroke: () => {
    if (!get().isDrawing && !activeStroke) {
      return;
    }
    activeStroke = null;
    redoStackBeforeStroke = null;
    set({ isDrawing: false });
  },

  cancelStroke: () => {
    const state = get();
    const session = activeStroke;
    if (!state.isDrawing || !session) {
      return;
    }

    const active = findLayer(state.layers, state.activeLayerId);
    activeStroke = null;
    const previousRedoStack = redoStackBeforeStroke;
    redoStackBeforeStroke = null;

    if (!active) {
      set({ isDrawing: false });
      return;
    }

    active.pixels.set(session.base);
    set({
      isDrawing: false,
      layers: mapLayer(state.layers, active.id, (layer) => ({
        ...layer,
        undoStack: layer.undoStack.slice(0, -1),
        redoStack: previousRedoStack ?? [],
      })),
      revision: bump(state.revision),
    });
  },

  paintAt: (x, y) => {
    const state = get();
    const session = activeStroke;
    const active = findLayer(state.layers, state.activeLayerId);
    if (!state.isDrawing || !session || !isLayerDrawable(active)) {
      return false;
    }
    if (!stampStrokeAt(session, state.width, state.height, x, y)) {
      return false;
    }
    clipCoverageToSelectionMask(session.coverage, state.selectionMask);
    applyStrokeSessionToLayer(active!.pixels, session, state.width, state.height);
    set({ revision: bump(state.revision) });
    return true;
  },

  paintSegment: (x0, y0, x1, y1) => {
    const state = get();
    const session = activeStroke;
    const active = findLayer(state.layers, state.activeLayerId);
    if (!state.isDrawing || !session || !isLayerDrawable(active)) {
      return false;
    }
    if (
      !stampSegmentIntoCoverage(
        session.coverage,
        state.width,
        state.height,
        x0,
        y0,
        x1,
        y1,
        session.mask,
        session.size,
      )
    ) {
      return false;
    }
    clipCoverageToSelectionMask(session.coverage, state.selectionMask);
    applyStrokeSessionToLayer(active!.pixels, session, state.width, state.height);
    set({ revision: bump(state.revision) });
    return true;
  },

  previewStrokeSegment: (x0, y0, x1, y1) => {
    const state = get();
    const session = activeStroke;
    const active = findLayer(state.layers, state.activeLayerId);
    if (!state.isDrawing || !session || !isLayerDrawable(active)) {
      return false;
    }

    session.coverage.fill(0);
    stampSegmentIntoCoverage(
      session.coverage,
      state.width,
      state.height,
      x0,
      y0,
      x1,
      y1,
      session.mask,
      session.size,
    );
    clipCoverageToSelectionMask(session.coverage, state.selectionMask);
    applyStrokeSessionToLayer(active!.pixels, session, state.width, state.height);
    set({ revision: bump(state.revision) });
    return true;
  },

  fillAt: (x, y, rgba): FillResult => {
    const state = get();
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед заливкой" };
    }
    const active = findLayer(state.layers, state.activeLayerId);
    if (!active) {
      return { ok: false, reason: "Слой не найден" };
    }
    if (active.locked) {
      return { ok: false, reason: "Слой заблокирован" };
    }
    if (!active.visible) {
      return { ok: false, reason: "Слой скрыт" };
    }

    const next = clonePixels(active.pixels);
    const filledPixels = floodFill(next, state.width, state.height, x, y, rgba);
    if (filledPixels === 0) {
      return { ok: true, filledPixels: 0 };
    }

    // Clip fill to selection mask when present.
    let clipped = filledPixels;
    if (state.selectionMask) {
      clipped = 0;
      for (let i = 0; i < state.selectionMask.length; i++) {
        if (state.selectionMask[i]! !== 0) {
          const o = i * 4;
          if (
            next[o] !== active.pixels[o] ||
            next[o + 1] !== active.pixels[o + 1] ||
            next[o + 2] !== active.pixels[o + 2] ||
            next[o + 3] !== active.pixels[o + 3]
          ) {
            clipped += 1;
          }
          continue;
        }
        const o = i * 4;
        next[o] = active.pixels[o]!;
        next[o + 1] = active.pixels[o + 1]!;
        next[o + 2] = active.pixels[o + 2]!;
        next[o + 3] = active.pixels[o + 3]!;
      }
      if (clipped === 0) {
        return { ok: true, filledPixels: 0 };
      }
    }
    if (!buffersDiffer(next, active.pixels)) {
      return { ok: true, filledPixels: 0 };
    }

    set({
      layers: mapLayer(state.layers, active.id, (layer) => ({
        ...pushLayerUndo(layer),
        pixels: next,
      })),
      revision: bump(state.revision),
    });
    return { ok: true, filledPixels: clipped };
  },

  setSelectionTool: (tool: SelectionTool) => {
    set({ selectionTool: tool });
  },

  setSelectionOpMode: (mode: SelectionOpMode) => {
    set({ selectionOpMode: mode });
  },

  beginSelectionDraft: (draft: SelectionDraft) => {
    const state = get();
    if (state.floatSession) {
      get().commitFloat();
    }
    set(beginSelectionDraftInState(get(), draft));
  },

  updateSelectionDraft: (patch) => {
    set(updateSelectionDraftInState(get(), patch));
  },

  commitSelectionDraft: () => {
    set(commitSelectionDraftInState(get()));
  },

  cancelSelectionDraft: () => {
    set(cancelSelectionDraft(get()));
  },

  deselect: () => {
    const state = get();
    if (state.floatSession) {
      get().commitFloat();
    }
    set(deselectSelection(get()));
  },

  selectAll: () => {
    const state = get();
    if (state.floatSession) {
      get().commitFloat();
    }
    set(selectAllSelection(get()));
  },

  startFloatFromSelection: () => {
    const { ok, partial } = startFloatFromSelectionInState(get());
    if (ok) set(partial);
    return ok;
  },

  updateFloatTransform: (transform: FloatTransform) => {
    set(updateFloatTransformInState(get(), transform));
  },

  commitFloat: () => {
    set(commitFloatInState(get(), MAX_LAYER_UNDO_STEPS));
  },

  cancelFloat: () => {
    set(cancelFloatInState(get()));
  },

  copySelection: () => {
    set(copySelectionInState(get()));
  },

  cutSelection: () => {
    set(cutSelectionInState(get(), MAX_LAYER_UNDO_STEPS));
  },

  pasteClipboard: () => {
    set(pasteClipboardInState(get(), MAX_LAYER_UNDO_STEPS));
  },

  deleteSelection: () => {
    set(deleteSelectionInState(get(), MAX_LAYER_UNDO_STEPS));
  },

  setWandTolerance: (value) => {
    const next = Number.isFinite(value) ? Math.min(255, Math.max(0, Math.round(value))) : 0;
    set({ wandTolerance: next });
  },

  setWandContiguous: (value) => {
    set({ wandContiguous: value });
  },

  setWandSampleAllLayers: (value) => {
    set({ wandSampleAllLayers: value });
  },

  resizeDocument: (width, height): LayerOpResult => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      return { ok: false, reason: "Некорректный размер холста" };
    }
    if (width > MAX_DOCUMENT_EDGE || height > MAX_DOCUMENT_EDGE) {
      return {
        ok: false,
        reason: `Холст больше ${MAX_DOCUMENT_EDGE}×${MAX_DOCUMENT_EDGE}`,
      };
    }
    const state = get();
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед сменой размера" };
    }
    if (state.width === width && state.height === height) {
      return { ok: true };
    }

    activeStroke = null;
    redoStackBeforeStroke = null;

    const layers = state.layers.map((layer) => ({
      ...layer,
      pixels: createEmptyPixels(width, height),
      undoStack: [],
      redoStack: [],
    }));
    const frames = state.frames.map((frame) => {
      const cels: Record<LayerId, ReturnType<typeof emptyCel>> = {};
      for (const layer of layers) {
        cels[layer.id] =
          frame.id === state.activeFrameId ? shareCel(layer) : emptyCel(width, height);
      }
      return { ...frame, cels };
    });

    set({
      width,
      height,
      layers,
      frames,
      isDrawing: false,
      selectionMask: null,
      selectionDraft: null,
      floatSession: null,
      selectionClipboard: null,
      lastPasteOrigin: null,
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  importPixels: (pixels, target: ImportPixelsTarget): LayerOpResult => {
    const state = get();
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед импортом" };
    }
    const expected = state.width * state.height * 4;
    if (pixels.length !== expected) {
      return { ok: false, reason: "Некорректный размер буфера" };
    }

    if (target === "active") {
      const active = findLayer(state.layers, state.activeLayerId);
      if (!active) {
        return { ok: false, reason: "Слой не найден" };
      }
      if (active.locked) {
        return { ok: false, reason: "Слой заблокирован" };
      }
      if (!active.visible) {
        return { ok: false, reason: "Слой скрыт" };
      }
      const placed = clonePixels(pixels);
      set({
        layers: mapLayer(state.layers, active.id, (layer) => ({
          ...pushLayerUndo(layer),
          pixels: placed,
        })),
        revision: bump(state.revision),
      });
      return { ok: true };
    }

    if (state.layers.length >= MAX_LAYERS) {
      return { ok: false, reason: `Максимум ${MAX_LAYERS} слоёв` };
    }

    const layer = createLayer({
      name: nextImportLayerName(state.layers),
      pixels: clonePixels(pixels),
    });
    layer.undoStack = [createEmptyPixels(state.width, state.height)];
    set({
      layers: [...state.layers, layer],
      frames: withLayerCel(
        state.frames,
        state.activeFrameId,
        layer.id,
        shareCel(layer),
        state.width,
        state.height,
      ),
      activeLayerId: layer.id,
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  importStoryboardFrames: (framePixels, mode, frameDurationMs = DEFAULT_FRAME_DURATION_MS): LayerOpResult => {
    const state = get();
    if (state.isPlaying) {
      return { ok: false, reason: PLAYBACK_BLOCK };
    }
    if (state.isDrawing) {
      return { ok: false, reason: "Завершите штрих перед импортом" };
    }
    if (framePixels.length < 1) {
      return { ok: false, reason: "Нужен хотя бы один кадр" };
    }
    if (framePixels.length > MAX_FRAMES) {
      return { ok: false, reason: `Максимум ${MAX_FRAMES} кадров` };
    }
    const expected = state.width * state.height * 4;
    for (const buffer of framePixels) {
      if (buffer.length !== expected) {
        return { ok: false, reason: "Некорректный размер буфера кадра" };
      }
    }
    if (mode === "append" && state.frames.length + framePixels.length > MAX_FRAMES) {
      return {
        ok: false,
        reason: `Максимум ${MAX_FRAMES} кадров (можно добавить ${MAX_FRAMES - state.frames.length})`,
      };
    }
    if (mode === "append" && state.layers.length >= MAX_LAYERS) {
      return { ok: false, reason: `Максимум ${MAX_LAYERS} слоёв` };
    }

    const layerName = nextStoryboardLayerName(state.layers);
    const { width, height } = state;
    const durationMs = clampDurationMs(frameDurationMs);

    if (mode === "replace") {
      const layer = createLayer({
        name: layerName,
        pixels: clonePixels(framePixels[0]!),
      });
      const frames = framePixels.map((pixels) => storyboardFrameFromPixels(layer.id, pixels, durationMs));
      const activeFrame = frames[0]!;
      set({
        layers: projectFrame([layer], activeFrame, width, height),
        frames,
        activeLayerId: layer.id,
        activeFrameId: activeFrame.id,
        isPlaying: false,
        revision: bump(state.revision),
      });
      return { ok: true };
    }

    const newLayer = createLayer({
      name: layerName,
      pixels: clonePixels(framePixels[0]!),
    });
    const existingFrames = state.frames.map((frame) => ({
      ...frame,
      cels: {
        ...frame.cels,
        [newLayer.id]: emptyCel(width, height),
      },
    }));
    const appended = framePixels.map((pixels) => {
      const cels: Record<LayerId, ReturnType<typeof emptyCel>> = {};
      for (const layer of state.layers) {
        cels[layer.id] = emptyCel(width, height);
      }
      cels[newLayer.id] = {
        pixels: clonePixels(pixels),
        undoStack: [],
        redoStack: [],
      };
      return {
        id: createFrameId(),
        durationMs,
        cels,
      };
    });
    const frames = [...existingFrames, ...appended];
    const activeFrame = appended[0]!;
    const layers = [...state.layers, newLayer];
    set({
      layers: projectFrame(layers, activeFrame, width, height),
      frames,
      activeLayerId: newLayer.id,
      activeFrameId: activeFrame.id,
      isPlaying: false,
      revision: bump(state.revision),
    });
    return { ok: true };
  },

  undo: () => {
    const state = get();
    if (state.isDrawing || state.isPlaying) {
      return;
    }
    if (state.floatSession) {
      get().cancelFloat();
      return;
    }
    const active = findLayer(state.layers, state.activeLayerId);
    if (!active || active.undoStack.length === 0) {
      return;
    }
    const previous = active.undoStack[active.undoStack.length - 1]!;
    set({
      layers: mapLayer(state.layers, active.id, (layer) => ({
        ...layer,
        pixels: clonePixels(previous),
        undoStack: layer.undoStack.slice(0, -1),
        redoStack: [...layer.redoStack, clonePixels(layer.pixels)],
      })),
      revision: bump(state.revision),
    });
  },

  redo: () => {
    const state = get();
    if (state.isDrawing || state.isPlaying) {
      return;
    }
    const active = findLayer(state.layers, state.activeLayerId);
    if (!active || active.redoStack.length === 0) {
      return;
    }
    const next = active.redoStack[active.redoStack.length - 1]!;
    set({
      layers: mapLayer(state.layers, active.id, (layer) => ({
        ...layer,
        pixels: clonePixels(next),
        redoStack: layer.redoStack.slice(0, -1),
        undoStack: [...layer.undoStack, clonePixels(layer.pixels)],
      })),
      revision: bump(state.revision),
    });
  },

  loadDraft: (snapshot: EditorDraftSnapshot): boolean => {
    if (
      !Number.isInteger(snapshot.width) ||
      !Number.isInteger(snapshot.height) ||
      snapshot.width < 1 ||
      snapshot.height < 1 ||
      snapshot.width > MAX_DOCUMENT_EDGE ||
      snapshot.height > MAX_DOCUMENT_EDGE ||
      snapshot.layers.length === 0 ||
      snapshot.frames.length === 0
    ) {
      return false;
    }
    const expected = snapshot.width * snapshot.height * 4;
    const activeFrame =
      snapshot.frames.find((frame) => frame.id === snapshot.activeFrameId) ?? snapshot.frames[0];
    if (!activeFrame) {
      return false;
    }
    const activeLayerId = snapshot.layers.some((layer) => layer.id === snapshot.activeLayerId)
      ? snapshot.activeLayerId
      : snapshot.layers[0]!.id;

    activeStroke = null;
    redoStackBeforeStroke = null;
    resetLayerIdSequence(maxNumericId(snapshot.layers.map((layer) => layer.id), "layer") + 1);
    resetFrameIdSequence(maxNumericId(snapshot.frames.map((frame) => frame.id), "frame") + 1);

    const layers = snapshot.layers.map((layer) => {
      const stored = activeFrame.cels[layer.id]?.pixels;
      const pixels =
        stored instanceof Uint8ClampedArray && stored.length === expected
          ? clonePixels(stored)
          : createEmptyPixels(snapshot.width, snapshot.height);
      return {
        id: layer.id,
        name: layer.name || "Слой",
        visible: layer.visible,
        locked: layer.locked,
        opacity: clampOpacity(layer.opacity),
        blendMode: isBlendMode(layer.blendMode) ? layer.blendMode : "normal",
        pixels,
        undoStack: [] as Uint8ClampedArray<ArrayBuffer>[],
        redoStack: [] as Uint8ClampedArray<ArrayBuffer>[],
      };
    });

    const frames = snapshot.frames.map((frame) => {
      const cels: EditorFrame["cels"] = {};
      for (const layer of layers) {
        if (frame.id === activeFrame.id) {
          cels[layer.id] = shareCel(layer);
          continue;
        }
        const stored = frame.cels[layer.id]?.pixels;
        cels[layer.id] = {
          pixels:
            stored instanceof Uint8ClampedArray && stored.length === expected
              ? clonePixels(stored)
              : createEmptyPixels(snapshot.width, snapshot.height),
          undoStack: [],
          redoStack: [],
        };
      }
      return {
        id: frame.id,
        durationMs: clampDurationMs(frame.durationMs),
        cels,
      };
    });

    set({
      width: snapshot.width,
      height: snapshot.height,
      layers,
      activeLayerId,
      frames,
      activeFrameId: activeFrame.id,
      onionSkin: snapshot.onionSkin,
      isPlaying: false,
      isDrawing: false,
      revision: bump(get().revision),
      primaryColor: snapshot.primaryColor || DEFAULT_PRIMARY_COLOR,
      secondaryColor: snapshot.secondaryColor || DEFAULT_SECONDARY_COLOR,
      selectionMask: null,
      selectionDraft: null,
      floatSession: null,
      selectionClipboard: null,
      lastPasteOrigin: null,
    });
    return true;
  },

  resetDocument: () => {
    activeStroke = null;
    redoStackBeforeStroke = null;
    resetFrameIdSequence(1);
    resetLayerIdSequence(1);
    const layer = createLayer({ name: "Слой 1" });
    const frame = createFrameFromLayers([layer]);
    set({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      layers: [layer],
      activeLayerId: layer.id,
      frames: [frame],
      activeFrameId: frame.id,
      onionSkin: false,
      isPlaying: false,
      revision: bump(get().revision),
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
      isDrawing: false,
      selectionMask: null,
      selectionDraft: null,
      floatSession: null,
      selectionClipboard: null,
      lastPasteOrigin: null,
    });
  },

  clear: () => {
    const state = get();
    if (state.isPlaying) {
      return;
    }
    const active = findLayer(state.layers, state.activeLayerId);
    if (!active || active.locked) {
      return;
    }
    activeStroke = null;
    redoStackBeforeStroke = null;
    set({
      isDrawing: false,
      layers: mapLayer(state.layers, active.id, (layer) => {
        const withUndo = pushLayerUndo(layer);
        return {
          ...withUndo,
          pixels: createEmptyPixels(state.width, state.height),
        };
      }),
      revision: bump(state.revision),
    });
  },

  getCompositePixels: () => {
    const { layers, width, height } = get();
    return compositeLayers(layers, width, height);
  },

  createImageData: () => {
    const { width, height, getCompositePixels } = get();
    return new ImageData(getCompositePixels(), width, height);
  },

  exportPngBlob: () => {
    const { width, height, createImageData } = get();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return Promise.reject(new Error("2D canvas context unavailable"));
    }
    ctx.putImageData(createImageData(), 0, 0);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("PNG export failed"));
        }
      }, "image/png");
    });
  },
};
});

/** Test helper: replace document state. */
export function __resetEditorCanvasStoreForTests(partial?: {
  layers?: EditorLayer[];
  activeLayerId?: LayerId;
}): void {
  activeStroke = null;
  redoStackBeforeStroke = null;
  resetFrameIdSequence(1);
  const layer = createLayer({ name: "Слой 1" });
  const layers = partial?.layers ?? [layer];
  const frame = createFrameFromLayers(layers);
  useEditorCanvasStore.setState({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    layers,
    activeLayerId: partial?.activeLayerId ?? (partial?.layers?.[0]?.id ?? layer.id),
    frames: [frame],
    activeFrameId: frame.id,
    onionSkin: false,
    isPlaying: false,
    revision: 0,
    primaryColor: DEFAULT_PRIMARY_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
    isDrawing: false,
    selectionTool: "rect",
    selectionOpMode: "replace",
    selectionMask: null,
    selectionDraft: null,
    floatSession: null,
    selectionClipboard: null,
    lastPasteOrigin: null,
    wandTolerance: WAND_DEFAULT_TOLERANCE,
    wandContiguous: true,
    wandSampleAllLayers: true,
  });
}

export type { BlendMode };
