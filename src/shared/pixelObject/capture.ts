import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { compositeFrame } from "@/shared/store/editorCanvas/model/frames";

export type ExportFrame = {
  pixels: Uint8ClampedArray;
  durationMs: number;
};

/**
 * Stop preview, flush an in-progress stroke, then snapshot every composited frame.
 * A single frame is a valid static TPO.
 */
export function captureExportFrames(): { width: number; height: number; frames: ExportFrame[] } {
  const store = useEditorCanvasStore.getState();
  store.pausePlayback();
  store.endStroke();
  const state = useEditorCanvasStore.getState();
  return {
    width: state.width,
    height: state.height,
    frames: state.frames.map((frame) => ({
      pixels: compositeFrame(state.layers, frame, state.width, state.height),
      durationMs: frame.durationMs,
    })),
  };
}
