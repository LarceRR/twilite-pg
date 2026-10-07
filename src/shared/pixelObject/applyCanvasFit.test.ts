import { beforeEach, describe, expect, it } from "vitest";

import { applyCanvasFitToDocument } from "./applyCanvasFit";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import { resetLayerIdSequence } from "@/shared/store/editorCanvas/model/layerFactory";
import { createEmptyPixels } from "@/shared/store/editorCanvas/model/pixels";

describe("applyCanvasFitToDocument", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
  });

  it("nearest-downscales an oversized document and leaves submit-sized canvas", () => {
    expect(useEditorCanvasStore.getState().resizeDocument(320, 200).ok).toBe(true);
    const pixels = createEmptyPixels(320, 200);
    pixels[0] = 40;
    pixels[3] = 255;
    expect(useEditorCanvasStore.getState().importPixels(pixels, "active").ok).toBe(true);

    const result = applyCanvasFitToDocument(160, "nearest-downscale");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.size).toEqual({ width: 160, height: 100 });
    expect(useEditorCanvasStore.getState().width).toBe(160);
    expect(useEditorCanvasStore.getState().height).toBe(100);
  });

  it("center-crops without silently changing already-valid canvases", () => {
    const result = applyCanvasFitToDocument(160, "center-crop");
    expect(result).toEqual({ ok: true, size: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT } });
  });
});
