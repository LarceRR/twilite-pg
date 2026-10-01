import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import { resetLayerIdSequence } from "@/shared/store/editorCanvas/model/layerFactory";
import { __resetEditorPaletteStoreForTests } from "@/shared/store/editorPalette";
import { commitStoryboardImport } from "./commitStoryboardImport";

describe("commitStoryboardImport", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
    __resetEditorPaletteStoreForTests();
  });

  it("adopts the first crop as the document and letterboxes a shorter frame", () => {
    const native = new Uint8ClampedArray(4 * 2 * 4);
    native[0] = 12;
    native[3] = 255;
    native[8] = 40;
    native[11] = 255;
    const result = commitStoryboardImport({
      native,
      nativeWidth: 4,
      nativeHeight: 2,
      rects: [
        { x: 0, y: 0, w: 2, h: 2 },
        { x: 2, y: 0, w: 2, h: 1 },
      ],
      mode: "replace",
      frameDurationMs: 100,
    });

    expect(result.ok).toBe(true);
    const state = useEditorCanvasStore.getState();
    expect(state.width).toBe(2);
    expect(state.height).toBe(2);
    expect(state.frames).toHaveLength(2);
    expect(state.getActiveLayer()?.pixels[0]).toBe(12);
    useEditorCanvasStore.getState().setActiveFrame(state.frames[1]!.id);
    const second = useEditorCanvasStore.getState().getActiveLayer()!.pixels;
    expect(second[0]).toBe(40);
    expect(second[(1 * 2 + 0) * 4 + 3]).toBe(0);
  });

  it("refuses a frame larger than the first", () => {
    const native = new Uint8ClampedArray(4 * 4);
    const result = commitStoryboardImport({
      native,
      nativeWidth: 1,
      nativeHeight: 1,
      rects: [
        { x: 0, y: 0, w: 1, h: 1 },
        { x: 0, y: 0, w: 2, h: 1 },
      ],
      mode: "replace",
      frameDurationMs: 100,
    });
    expect(result.ok).toBe(false);
    expect(useEditorCanvasStore.getState().width).toBe(160);
  });
});
