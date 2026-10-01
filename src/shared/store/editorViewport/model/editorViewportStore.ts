import { create } from "zustand";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/shared/store/editorCanvas";
import {
  clampViewportPan,
  fitViewport,
  MIN_VIEWPORT_ZOOM,
  zoomAtPoint,
  type ViewportPoint,
  type ViewportTransform,
} from "./viewport";

export type EditorViewportState = ViewportTransform & {
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  initialized: boolean;
  showGrid: boolean;
  setDocumentSize: (width: number, height: number) => void;
  setViewportSize: (width: number, height: number) => void;
  zoomBy: (delta: number, anchor: ViewportPoint) => void;
  zoomTo: (zoom: number, anchor: ViewportPoint) => void;
  panBy: (deltaX: number, deltaY: number) => void;
  resetToFit: () => void;
  setShowGrid: (showGrid: boolean) => void;
  toggleGrid: () => void;
};

const initialState = {
  zoom: MIN_VIEWPORT_ZOOM,
  panX: 0,
  panY: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  documentWidth: CANVAS_WIDTH,
  documentHeight: CANVAS_HEIGHT,
  initialized: false,
  showGrid: true,
};

function normalizeExtent(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

export const useEditorViewportStore = create<EditorViewportState>((set, get) => ({
  ...initialState,

  setDocumentSize: (width, height) => {
    const documentWidth = Math.max(1, Math.round(Number.isFinite(width) ? width : 1));
    const documentHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : 1));
    set((state) => {
      if (state.documentWidth === documentWidth && state.documentHeight === documentHeight) {
        return state;
      }
      const document = { width: documentWidth, height: documentHeight };
      const viewport = { width: state.viewportWidth, height: state.viewportHeight };
      const fitted =
        state.initialized && viewport.width > 0 && viewport.height > 0
          ? fitViewport(viewport, document)
          : { zoom: state.zoom, panX: state.panX, panY: state.panY };
      return {
        ...state,
        documentWidth,
        documentHeight,
        ...fitted,
      };
    });
  },

  setViewportSize: (width, height) => {
    const viewportWidth = normalizeExtent(width);
    const viewportHeight = normalizeExtent(height);
    if (viewportWidth === 0 || viewportHeight === 0) {
      return;
    }

    set((state) => {
      if (
        state.initialized &&
        state.viewportWidth === viewportWidth &&
        state.viewportHeight === viewportHeight
      ) {
        return state;
      }

      const viewport = { width: viewportWidth, height: viewportHeight };
      if (!state.initialized) {
        return {
          ...fitViewport(viewport, { width: state.documentWidth, height: state.documentHeight }),
          viewportWidth,
          viewportHeight,
          initialized: true,
        };
      }

      const worldCenterX = (state.viewportWidth / 2 - state.panX) / state.zoom;
      const worldCenterY = (state.viewportHeight / 2 - state.panY) / state.zoom;
      const resized = clampViewportPan(
        {
          zoom: state.zoom,
          panX: Math.round(viewportWidth / 2 - worldCenterX * state.zoom),
          panY: Math.round(viewportHeight / 2 - worldCenterY * state.zoom),
        },
        viewport,
        { width: state.documentWidth, height: state.documentHeight },
      );

      return {
        ...resized,
        viewportWidth,
        viewportHeight,
      };
    });
  },

  zoomBy: (delta, anchor) => {
    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }
    get().zoomTo(get().zoom + Math.sign(delta), anchor);
  },

  zoomTo: (zoom, anchor) => {
    set((state) => {
      const transformed = zoomAtPoint(state, anchor, zoom);
      return clampViewportPan(
        transformed,
        { width: state.viewportWidth, height: state.viewportHeight },
        { width: state.documentWidth, height: state.documentHeight },
      );
    });
  },

  panBy: (deltaX, deltaY) => {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      return;
    }
    set((state) =>
      clampViewportPan(
        {
          zoom: state.zoom,
          panX: state.panX + deltaX,
          panY: state.panY + deltaY,
        },
        { width: state.viewportWidth, height: state.viewportHeight },
        { width: state.documentWidth, height: state.documentHeight },
      ),
    );
  },

  resetToFit: () => {
    const state = get();
    if (state.viewportWidth === 0 || state.viewportHeight === 0) {
      return;
    }
    set(
      fitViewport(
        { width: state.viewportWidth, height: state.viewportHeight },
        { width: state.documentWidth, height: state.documentHeight },
      ),
    );
  },

  setShowGrid: (showGrid) => set({ showGrid }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
}));

export function __resetEditorViewportStoreForTests(): void {
  useEditorViewportStore.setState(initialState);
}
