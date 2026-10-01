import { beforeEach, describe, expect, it } from "vitest";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { __resetEditorCanvasStoreForTests, useEditorCanvasStore } from "./editorCanvasStore";
import { resetLayerIdSequence } from "./layerFactory";

describe("resizeDocument", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
  });

  it("reallocates every layer to the new grid and clears selection", () => {
    const store = useEditorCanvasStore.getState();
    store.selectAll();
    store.addFrame();
    const result = store.resizeDocument(12, 8);
    expect(result.ok).toBe(true);

    const next = useEditorCanvasStore.getState();
    expect(next.width).toBe(12);
    expect(next.height).toBe(8);
    expect(next.selectionMask).toBeNull();
    expect(next.layers[0]?.pixels).toHaveLength(12 * 8 * 4);
    expect(next.frames).toHaveLength(2);
    for (const frame of next.frames) {
      for (const cel of Object.values(frame.cels)) {
        expect(cel.pixels).toHaveLength(12 * 8 * 4);
        expect(cel.undoStack).toHaveLength(0);
      }
    }
  });

  it("leaves a matching document untouched", () => {
    const before = useEditorCanvasStore.getState().layers[0]?.pixels;
    const result = useEditorCanvasStore.getState().resizeDocument(CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result.ok).toBe(true);
    expect(useEditorCanvasStore.getState().layers[0]?.pixels).toBe(before);
  });

  it("rejects a grid past the document edge", () => {
    const result = useEditorCanvasStore.getState().resizeDocument(1025, 8);
    expect(result.ok).toBe(false);
    expect(useEditorCanvasStore.getState().width).toBe(CANVAS_WIDTH);
  });
});
