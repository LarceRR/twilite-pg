import type { FrameId } from "./frames";
import type { EditorLayer, LayerId } from "./layerTypes";
import { clonePixels } from "./pixels";
import {
  type FloatSession,
  type FloatTransform,
  type SelectionClipboard,
  type SelectionDraft,
  type SelectionOpMode,
} from "./selection";
import {
  clipboardFromExtract,
  computePasteOrigin,
} from "./selectionClipboard";
import {
  applyBoolean,
  cloneMask,
  createFullMask,
  maskHitTest,
  normalizeMask,
  rasterizeDraftShape,
} from "./selectionMask";
import {
  clearUnderMask,
  extractUnderMask,
  identityTransformFromExtract,
  sampleFloatToCanvas,
  stampFloatOntoLayer,
} from "./selectionTransform";

export type SelectionStoreSlice = {
  width: number;
  height: number;
  layers: EditorLayer[];
  activeLayerId: LayerId;
  activeFrameId: FrameId;
  isPlaying: boolean;
  selectionMask: Uint8Array | null;
  selectionOpMode: SelectionOpMode;
  selectionDraft: SelectionDraft | null;
  floatSession: FloatSession | null;
  selectionClipboard: SelectionClipboard | null;
  lastPasteOrigin: { x: number; y: number } | null;
  revision: number;
};

function findLayer(layers: EditorLayer[], id: LayerId): EditorLayer | undefined {
  return layers.find((layer) => layer.id === id);
}

function mapLayer(
  layers: EditorLayer[],
  id: LayerId,
  mapper: (layer: EditorLayer) => EditorLayer,
): EditorLayer[] {
  return layers.map((layer) => (layer.id === id ? mapper(layer) : layer));
}

export function pushLayerUndoLocal(layer: EditorLayer, maxSteps: number): EditorLayer {
  const undoStack = [...layer.undoStack, clonePixels(layer.pixels)];
  const trimmed =
    undoStack.length > maxSteps
      ? undoStack.slice(undoStack.length - maxSteps)
      : undoStack;
  return { ...layer, undoStack: trimmed, redoStack: [] };
}

export function cancelSelectionDraft(
  state: SelectionStoreSlice,
): Partial<SelectionStoreSlice> {
  if (!state.selectionDraft) return {};
  return { selectionDraft: null, revision: state.revision + 1 };
}

export function deselectSelection(
  state: SelectionStoreSlice,
): Partial<SelectionStoreSlice> {
  if (!state.selectionMask && !state.selectionDraft && !state.floatSession) {
    return {};
  }
  return {
    selectionMask: null,
    selectionDraft: null,
    floatSession: null,
    revision: state.revision + 1,
  };
}

export function selectAllSelection(
  state: SelectionStoreSlice,
): Partial<SelectionStoreSlice> {
  if (state.isPlaying) return {};
  return {
    selectionMask: createFullMask(state.width, state.height),
    selectionDraft: null,
    // Keep float? Spec: select all while floating should commit first — caller handles.
    revision: state.revision + 1,
  };
}

export function beginSelectionDraftInState(
  state: SelectionStoreSlice,
  draft: SelectionDraft,
): Partial<SelectionStoreSlice> {
  if (state.isPlaying) return {};
  return {
    selectionDraft: draft,
    revision: state.revision + 1,
  };
}

export function updateSelectionDraftInState(
  state: SelectionStoreSlice,
  patch: Partial<SelectionDraft> & { kind: SelectionDraft["kind"] },
): Partial<SelectionStoreSlice> {
  const draft = state.selectionDraft;
  if (!draft || draft.kind !== patch.kind) return {};
  return {
    selectionDraft: { ...draft, ...patch } as SelectionDraft,
    revision: state.revision + 1,
  };
}

export function commitSelectionDraftInState(
  state: SelectionStoreSlice,
): Partial<SelectionStoreSlice> {
  const draft = state.selectionDraft;
  if (!draft) return {};

  let nextMask: Uint8Array | null = null;

  if (draft.kind === "rect") {
    nextMask = rasterizeDraftShape(
      "rect",
      {
        x0: draft.x0 + (draft.nudgeDx ?? 0),
        y0: draft.y0 + (draft.nudgeDy ?? 0),
        x1: draft.x1 + (draft.nudgeDx ?? 0),
        y1: draft.y1 + (draft.nudgeDy ?? 0),
        constrain: draft.constrainSquare,
      },
      state.width,
      state.height,
    );
  } else if (draft.kind === "ellipse") {
    nextMask = rasterizeDraftShape(
      "ellipse",
      {
        x0: draft.x0 + (draft.nudgeDx ?? 0),
        y0: draft.y0 + (draft.nudgeDy ?? 0),
        x1: draft.x1 + (draft.nudgeDx ?? 0),
        y1: draft.y1 + (draft.nudgeDy ?? 0),
        constrain: draft.constrainCircle,
      },
      state.width,
      state.height,
    );
  } else {
    nextMask = rasterizeDraftShape(
      "lasso",
      { points: draft.points },
      state.width,
      state.height,
    );
  }

  if (!nextMask) {
    // Empty / discarded draft — keep previous mask.
    return { selectionDraft: null, revision: state.revision + 1 };
  }

  // Subtract with no base → no-op.
  if (draft.opMode === "subtract" && !state.selectionMask) {
    return { selectionDraft: null, revision: state.revision + 1 };
  }

  const applied = applyBoolean(state.selectionMask, nextMask, draft.opMode);
  return {
    selectionMask: applied,
    selectionDraft: null,
    revision: state.revision + 1,
  };
}

export function startFloatFromSelectionInState(
  state: SelectionStoreSlice,
): { partial: Partial<SelectionStoreSlice>; ok: boolean } {
  if (state.isPlaying || state.floatSession || !state.selectionMask) {
    return { partial: {}, ok: false };
  }
  const layer = findLayer(state.layers, state.activeLayerId);
  if (!layer || layer.locked || !layer.visible) {
    return { partial: {}, ok: false };
  }

  const extract = extractUnderMask(
    layer.pixels,
    state.width,
    state.height,
    state.selectionMask,
  );
  if (!extract) {
    return { partial: {}, ok: false };
  }

  const baseLayerSnapshot = clonePixels(layer.pixels);
  const baseMaskSnapshot = cloneMask(state.selectionMask);
  const nextPixels = clonePixels(layer.pixels);
  clearUnderMask(nextPixels, state.width, state.height, state.selectionMask);

  const floatSession: FloatSession = {
    pixels: extract.pixels,
    mask: extract.mask,
    width: extract.width,
    height: extract.height,
    transform: identityTransformFromExtract(extract),
    baseLayerSnapshot,
    baseMaskSnapshot,
    sourceLayerId: layer.id,
    sourceFrameId: state.activeFrameId,
  };

  return {
    ok: true,
    partial: {
      layers: mapLayer(state.layers, layer.id, (l) => ({
        ...l,
        pixels: nextPixels,
      })),
      floatSession,
      selectionDraft: null,
      revision: state.revision + 1,
    },
  };
}

export function updateFloatTransformInState(
  state: SelectionStoreSlice,
  transform: FloatTransform,
): Partial<SelectionStoreSlice> {
  if (!state.floatSession) return {};
  const clamped: FloatTransform = {
    x: Math.round(transform.x),
    y: Math.round(transform.y),
    w: Math.max(1, Math.round(transform.w)),
    h: Math.max(1, Math.round(transform.h)),
    rotation: transform.rotation,
  };
  return {
    floatSession: { ...state.floatSession, transform: clamped },
    revision: state.revision + 1,
  };
}

export function commitFloatInState(
  state: SelectionStoreSlice,
  maxUndo: number,
): Partial<SelectionStoreSlice> {
  const session = state.floatSession;
  if (!session) return {};

  const layer = findLayer(state.layers, session.sourceLayerId);
  if (!layer) {
    return {
      floatSession: null,
      revision: state.revision + 1,
    };
  }

  const sampled = sampleFloatToCanvas(
    session.pixels,
    session.mask,
    session.width,
    session.height,
    session.transform,
    state.width,
    state.height,
  );

  // Stamp onto current layer pixels (hole already present from cut-out).
  // Use live layer buffer when still on source; otherwise restore from snapshot+stamp.
  const working = clonePixels(layer.pixels);
  // Ensure we start from cut-out baseline if layer was edited elsewhere — prefer live
  // which should already be base-with-hole while float is open.
  stampFloatOntoLayer(
    working,
    sampled.pixels,
    sampled.mask,
    state.width,
    state.height,
  );

  const nextMask = normalizeMask(sampled.mask);

  return {
    layers: mapLayer(state.layers, layer.id, (l) => ({
      ...pushLayerUndoLocal(l, maxUndo),
      pixels: working,
    })),
    selectionMask: nextMask,
    floatSession: null,
    selectionDraft: null,
    revision: state.revision + 1,
  };
}

export function cancelFloatInState(
  state: SelectionStoreSlice,
): Partial<SelectionStoreSlice> {
  const session = state.floatSession;
  if (!session) return {};

  const layer = findLayer(state.layers, session.sourceLayerId);
  if (!layer) {
    return {
      floatSession: null,
      selectionMask: session.baseMaskSnapshot
        ? cloneMask(session.baseMaskSnapshot)
        : null,
      revision: state.revision + 1,
    };
  }

  return {
    layers: mapLayer(state.layers, layer.id, (l) => ({
      ...l,
      pixels: clonePixels(session.baseLayerSnapshot),
    })),
    selectionMask: session.baseMaskSnapshot
      ? cloneMask(session.baseMaskSnapshot)
      : null,
    floatSession: null,
    revision: state.revision + 1,
  };
}

export function copySelectionInState(
  state: SelectionStoreSlice,
): Partial<SelectionStoreSlice> {
  if (state.floatSession) {
    const session = state.floatSession;
    const sampled = sampleFloatToCanvas(
      session.pixels,
      session.mask,
      session.width,
      session.height,
      session.transform,
      state.width,
      state.height,
    );
    const extract = extractUnderMask(
      sampled.pixels,
      state.width,
      state.height,
      sampled.mask,
    );
    if (!extract) return {};
    return {
      selectionClipboard: clipboardFromExtract(extract),
      lastPasteOrigin: null,
    };
  }

  if (!state.selectionMask) return {};
  const layer = findLayer(state.layers, state.activeLayerId);
  if (!layer) return {};
  const extract = extractUnderMask(
    layer.pixels,
    state.width,
    state.height,
    state.selectionMask,
  );
  if (!extract) return {};
  return {
    selectionClipboard: clipboardFromExtract(extract),
    lastPasteOrigin: null,
  };
}

export function cutSelectionInState(
  state: SelectionStoreSlice,
  maxUndo: number,
): Partial<SelectionStoreSlice> {
  if (state.isPlaying) return {};

  if (state.floatSession) {
    const session = state.floatSession;
    const layer = findLayer(state.layers, session.sourceLayerId);
    if (!layer || layer.locked) return {};

    const copyPartial = copySelectionInState(state);
    // Keep punched hole; push undo from base-with-hole baseline (current pixels).
    return {
      ...copyPartial,
      layers: mapLayer(state.layers, layer.id, (l) => ({
        ...pushLayerUndoLocal(l, maxUndo),
        pixels: clonePixels(l.pixels),
      })),
      floatSession: null,
      selectionMask: null,
      selectionDraft: null,
      revision: state.revision + 1,
    };
  }

  if (!state.selectionMask) return {};
  const layer = findLayer(state.layers, state.activeLayerId);
  if (!layer || layer.locked) return {};

  const copyPartial = copySelectionInState(state);
  const next = clonePixels(layer.pixels);
  clearUnderMask(next, state.width, state.height, state.selectionMask);

  return {
    ...copyPartial,
    layers: mapLayer(state.layers, layer.id, (l) => ({
      ...pushLayerUndoLocal(l, maxUndo),
      pixels: next,
    })),
    selectionMask: null,
    selectionDraft: null,
    floatSession: null,
    revision: state.revision + 1,
  };
}

export function pasteClipboardInState(
  state: SelectionStoreSlice,
  maxUndo: number,
): Partial<SelectionStoreSlice> {
  if (state.isPlaying || !state.selectionClipboard) return {};
  const layer = findLayer(state.layers, state.activeLayerId);
  if (!layer || layer.locked || !layer.visible) return {};

  let working = state;
  let committed: Partial<SelectionStoreSlice> = {};
  if (state.floatSession) {
    committed = commitFloatInState(state, maxUndo);
    working = { ...state, ...committed } as SelectionStoreSlice;
  }

  const clip = working.selectionClipboard ?? state.selectionClipboard;
  if (!clip) return committed;

  const origin = computePasteOrigin(
    clip.width,
    clip.height,
    state.width,
    state.height,
    working.lastPasteOrigin,
    working.lastPasteOrigin != null,
  );

  const baseLayerSnapshot = clonePixels(
    findLayer(working.layers, working.activeLayerId)?.pixels ?? layer.pixels,
  );
  // Paste does not punch a hole — float sits above; cancel restores snapshot.
  // Mask under paste: restore previous mask on cancel (often null after prior commit).
  const baseMaskSnapshot =
    working.selectionMask != null ? cloneMask(working.selectionMask) : null;

  const floatSession: FloatSession = {
    pixels: new Uint8ClampedArray(clip.pixels),
    mask: cloneMask(clip.mask),
    width: clip.width,
    height: clip.height,
    transform: {
      x: origin.x,
      y: origin.y,
      w: clip.width,
      h: clip.height,
      rotation: 0,
    },
    baseLayerSnapshot,
    baseMaskSnapshot,
    sourceLayerId: working.activeLayerId,
    sourceFrameId: working.activeFrameId,
  };

  return {
    ...committed,
    floatSession,
    lastPasteOrigin: origin,
    selectionDraft: null,
    revision: (committed.revision ?? state.revision) + 1,
  };
}

export function deleteSelectionInState(
  state: SelectionStoreSlice,
  maxUndo: number,
): Partial<SelectionStoreSlice> {
  if (state.isPlaying) return {};

  if (state.floatSession) {
    const session = state.floatSession;
    const layer = findLayer(state.layers, session.sourceLayerId);
    if (!layer || layer.locked) return {};
    // Keep hole; discard float; one undo.
    return {
      layers: mapLayer(state.layers, layer.id, (l) => ({
        ...pushLayerUndoLocal(l, maxUndo),
        pixels: clonePixels(l.pixels),
      })),
      floatSession: null,
      selectionMask: null,
      selectionDraft: null,
      revision: state.revision + 1,
    };
  }

  if (!state.selectionMask) return {};
  const layer = findLayer(state.layers, state.activeLayerId);
  if (!layer || layer.locked) return {};

  const next = clonePixels(layer.pixels);
  clearUnderMask(next, state.width, state.height, state.selectionMask);

  return {
    layers: mapLayer(state.layers, layer.id, (l) => ({
      ...pushLayerUndoLocal(l, maxUndo),
      pixels: next,
    })),
    selectionMask: null,
    selectionDraft: null,
    revision: state.revision + 1,
  };
}

export function selectionMaskContains(
  state: SelectionStoreSlice,
  x: number,
  y: number,
): boolean {
  return maskHitTest(state.selectionMask, state.width, state.height, x, y);
}
