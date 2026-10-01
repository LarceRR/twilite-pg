import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import {
  __resetEditorPaletteStoreForTests,
  useEditorPaletteStore,
} from "@/shared/store/editorPalette";
import { resetLayerIdSequence } from "@/shared/store/editorCanvas/model/layerFactory";
import { commitNativeImport } from "./commitNativeImport";

describe("commitNativeImport", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
    __resetEditorPaletteStoreForTests();
  });

  it("places the native grid, not an upscaled buffer, and merges opaque colors", () => {
    const native = new Uint8ClampedArray(2 * 2 * 4);
    native[0] = 10;
    native[1] = 20;
    native[2] = 30;
    native[3] = 255;

    const result = commitNativeImport({
      native,
      nativeWidth: 2,
      nativeHeight: 2,
      ontoActive: false,
    });

    expect(result.ok).toBe(true);
    const state = useEditorCanvasStore.getState();
    expect(state.width).toBe(2);
    expect(state.height).toBe(2);
    const layer = state.getActiveLayer()!;
    expect(layer.name).toBe("Import 1");
    expect(layer.pixels).toHaveLength(2 * 2 * 4);
    expect(layer.pixels[0]).toBe(10);
    expect(layer.pixels[1]).toBe(20);
    expect(layer.pixels[2]).toBe(30);
    expect(layer.pixels[4]).toBe(0);
    expect(useEditorPaletteStore.getState().colors.map((color) => color.hex)).toEqual(["#0a141e"]);
  });
});
