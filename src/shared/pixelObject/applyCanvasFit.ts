import {
  centerCropFrame,
  downscaleFrame,
  exceedsCanvasMax,
  type Size2D,
} from "@/shared/pixelObject/canvasFit";
import { captureExportFrames } from "@/shared/pixelObject/capture";
import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { useEditorViewportStore } from "@/shared/store/editorViewport";

export type CanvasFitMode = "nearest-downscale" | "center-crop";

export type ApplyCanvasFitResult =
  | { ok: true; size: Size2D }
  | { ok: false; reason: string };

/** Rebuild the document from transformed composites. Never mutates without an explicit mode. */
export function applyCanvasFitToDocument(
  canvasMax: number,
  mode: CanvasFitMode,
): ApplyCanvasFitResult {
  const state = useEditorCanvasStore.getState();
  const size = { width: state.width, height: state.height };
  if (!exceedsCanvasMax(size, canvasMax)) {
    return { ok: true, size };
  }

  const document = captureExportFrames();
  const durations = document.frames.map((frame) => frame.durationMs);
  const transformed = document.frames.map((frame) => {
    if (mode === "nearest-downscale") {
      return downscaleFrame(frame.pixels, size, canvasMax);
    }
    return centerCropFrame(frame.pixels, size, canvasMax);
  });
  const nextSize = transformed[0]?.size;
  if (!nextSize) {
    return { ok: false, reason: "Нет кадров для преобразования" };
  }

  const resized = useEditorCanvasStore.getState().resizeDocument(nextSize.width, nextSize.height);
  if (!resized.ok) {
    return resized;
  }
  useEditorViewportStore.getState().setDocumentSize(nextSize.width, nextSize.height);

  const imported = useEditorCanvasStore
    .getState()
    .importStoryboardFrames(
      transformed.map((frame) => frame.pixels),
      "replace",
      durations[0],
    );
  if (!imported.ok) {
    return imported;
  }

  const frames = useEditorCanvasStore.getState().frames;
  frames.forEach((frame, index) => {
    const duration = durations[index];
    if (typeof duration === "number") {
      useEditorCanvasStore.getState().setFrameDuration(frame.id, duration);
    }
  });

  return { ok: true, size: nextSize };
}
