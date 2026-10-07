import type { BrushShape } from "./brushShapes";
import type { Rgba } from "./color";
import type { EditorDraftSnapshot } from "./draftDocument";
import type { EditorFrame, FrameId } from "./frames";
import type { BlendMode, EditorLayer, LayerId } from "./layerTypes";
import type { StrokePaintMode } from "./strokeCoverage";
import type {
  FloatSession,
  FloatTransform,
  SelectionClipboard,
  SelectionDraft,
  SelectionOpMode,
  SelectionTool,
} from "./selection";

export type { EditorFrame, FrameId } from "./frames";
export type { BlendMode, EditorLayer, LayerId } from "./layerTypes";
export type { BrushShape } from "./brushShapes";
export type { StrokePaintMode } from "./strokeCoverage";
export type {
  FloatSession,
  FloatTransform,
  SelectionClipboard,
  SelectionDraft,
  SelectionOpMode,
  SelectionTool,
} from "./selection";

export type LayerOpResult = { ok: true } | { ok: false; reason: string };

export type ImportPixelsTarget = "active" | "new-layer";

/** `filledPixels === 0` is a no-op (same color) and pushes no undo step. */
export type FillResult = { ok: true; filledPixels: number } | { ok: false; reason: string };

export type BeginStrokeOptions = {
  rgba: Rgba;
  size: number;
  shape?: BrushShape;
  softness?: number;
  mode?: StrokePaintMode;
};

export interface EditorCanvasState {
  width: number;
  height: number;
  layers: EditorLayer[];
  activeLayerId: LayerId;
  /** One cel per layer. The active frame shares the live layer buffers. */
  frames: EditorFrame[];
  activeFrameId: FrameId;
  onionSkin: boolean;
  /** Timeline preview. Paint is blocked until playback stops. */
  isPlaying: boolean;
  /** Bumps on buffer / structure changes so React can sync the view. */
  revision: number;
  primaryColor: string;
  secondaryColor: string;
  isDrawing: boolean;
  /** Select-tool sub-tool (rect/ellipse/lasso/wand). */
  selectionTool: SelectionTool;
  /** Sticky boolean mode from flyout. */
  selectionOpMode: SelectionOpMode;
  /** Document-level binary mask; null = Idle. */
  selectionMask: Uint8Array | null;
  /** Live draft while pointer is down. */
  selectionDraft: SelectionDraft | null;
  /** Floating pixels after cut-out / paste. */
  floatSession: FloatSession | null;
  /** Internal clipboard (not OS). */
  selectionClipboard: SelectionClipboard | null;
  /** Last paste origin for +1,+1 spam offset. */
  lastPasteOrigin: { x: number; y: number } | null;
  wandTolerance: number;
  wandContiguous: boolean;
  /** Photoshop "Sample All Layers" — sample composite instead of active layer. */
  wandSampleAllLayers: boolean;

  setPrimaryColor: (hex: string) => void;
  setSecondaryColor: (hex: string) => void;
  swapColors: () => void;

  getActiveLayer: () => EditorLayer | undefined;
  isActiveLayerDrawable: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getActiveUndoDepth: () => number;
  getActiveRedoDepth: () => number;

  addLayer: () => LayerOpResult;
  deleteLayer: (id: LayerId) => LayerOpResult;
  duplicateLayer: (id: LayerId) => LayerOpResult;
  setActiveLayer: (id: LayerId) => LayerOpResult;
  reorderLayer: (fromIndex: number, toIndex: number) => LayerOpResult;
  setLayerVisibility: (id: LayerId, visible: boolean) => void;
  setLayerLocked: (id: LayerId, locked: boolean) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
  setLayerBlendMode: (id: LayerId, blendMode: BlendMode) => void;
  renameLayer: (id: LayerId, name: string) => void;

  addFrame: () => LayerOpResult;
  deleteFrame: (id: FrameId) => LayerOpResult;
  setActiveFrame: (id: FrameId, options?: { keepPlaying?: boolean }) => LayerOpResult;
  moveFrame: (offset: -1 | 1) => LayerOpResult;
  reorderFrame: (fromIndex: number, toIndex: number) => LayerOpResult;
  setFrameDuration: (id: FrameId, durationMs: number) => void;
  playPreview: () => void;
  pausePlayback: () => void;
  toggleOnionSkin: () => void;
  /** Composite of the previous (-1) or next (+1) frame while onion skin is on. */
  getNeighborComposite: (offset: -1 | 1) => Uint8ClampedArray<ArrayBuffer> | null;
  hasOpaqueDocument: () => boolean;

  beginStroke: (options: BeginStrokeOptions) => boolean;
  endStroke: () => void;
  cancelStroke: () => void;
  paintAt: (x: number, y: number) => boolean;
  paintSegment: (x0: number, y0: number, x1: number, y1: number) => boolean;
  previewStrokeSegment: (x0: number, y0: number, x1: number, y1: number) => boolean;
  /** Contiguous 4-way fill on the active layer, sampled from the active layer only. */
  fillAt: (x: number, y: number, rgba: Rgba) => FillResult;
  setSelectionTool: (tool: SelectionTool) => void;
  setSelectionOpMode: (mode: SelectionOpMode) => void;
  beginSelectionDraft: (draft: SelectionDraft) => void;
  updateSelectionDraft: (
    patch: Partial<SelectionDraft> & { kind: SelectionDraft["kind"] },
  ) => void;
  commitSelectionDraft: () => void;
  cancelSelectionDraft: () => void;
  deselect: () => void;
  selectAll: () => void;
  startFloatFromSelection: () => boolean;
  updateFloatTransform: (transform: FloatTransform) => void;
  commitFloat: () => void;
  cancelFloat: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  deleteSelection: () => void;
  setWandTolerance: (value: number) => void;
  setWandContiguous: (value: boolean) => void;
  setWandSampleAllLayers: (value: boolean) => void;
  /**
   * Adopt a new document size. Layer and frame buffers are reallocated empty,
   * and selection is cleared, because old pixels belong to the previous grid.
   * Same size is a no-op.
   */
  resizeDocument: (width: number, height: number) => LayerOpResult;
  /** Replace the active layer or append an `Import N` layer. One undo step restores the previous pixels. */
  importPixels: (pixels: Uint8ClampedArray, target: ImportPixelsTarget) => LayerOpResult;
  /** Bulk storyboard import: one layer, one cel per frame. Replace drops other layers/frames. */
  importStoryboardFrames: (
    framePixels: readonly Uint8ClampedArray[],
    mode: "replace" | "append",
    frameDurationMs?: number,
  ) => LayerOpResult;
  undo: () => void;
  redo: () => void;
  /** Replace the document with a browser draft. False when the snapshot cannot be applied. */
  loadDraft: (snapshot: EditorDraftSnapshot) => boolean;
  /** Empty document at the default canvas size. */
  resetDocument: () => void;
  clear: () => void;

  getCompositePixels: () => Uint8ClampedArray<ArrayBuffer>;
  createImageData: () => ImageData;
  exportPngBlob: () => Promise<Blob>;
}
