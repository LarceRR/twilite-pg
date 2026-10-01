import { beforeEach, describe, expect, it } from "vitest";
import { CANVAS_HEIGHT, CANVAS_WIDTH, MAX_LAYERS } from "./constants";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "./editorCanvasStore";
import { createLayer, resetLayerIdSequence } from "./layerFactory";
import { placeNativeGrid } from "./importPlacement";
import { createEmptyPixels } from "./pixels";

function nativeRedPixel(): Uint8ClampedArray {
  const source = new Uint8ClampedArray(4);
  source[0] = 255;
  source[3] = 255;
  return source;
}

describe("importPixels", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
  });

  it("puts native pixels on a new Import layer and undoes back to empty", () => {
    const placed = placeNativeGrid(nativeRedPixel(), 1, 1, "top-left");
    const result = useEditorCanvasStore.getState().importPixels(placed.pixels, "new-layer");

    expect(result.ok).toBe(true);
    const imported = useEditorCanvasStore.getState().getActiveLayer()!;
    expect(imported.name).toBe("Import 1");
    expect(imported.pixels[0]).toBe(255);
    expect(imported.pixels[3]).toBe(255);

    useEditorCanvasStore.getState().undo();
    const cleared = useEditorCanvasStore.getState().getActiveLayer()!;
    expect(cleared.pixels[0]).toBe(0);
    expect(cleared.pixels[3]).toBe(0);
    expect(useEditorCanvasStore.getState().canRedo()).toBe(true);
  });

  it("snapshots the active layer before replacing it", () => {
    const active = useEditorCanvasStore.getState().getActiveLayer()!;
    active.pixels[0] = 7;
    active.pixels[3] = 255;

    const placed = placeNativeGrid(nativeRedPixel(), 1, 1, "top-left");
    expect(useEditorCanvasStore.getState().importPixels(placed.pixels, "active").ok).toBe(true);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(1);
    expect(useEditorCanvasStore.getState().getActiveLayer()!.pixels[0]).toBe(255);

    useEditorCanvasStore.getState().undo();
    expect(useEditorCanvasStore.getState().getActiveLayer()!.pixels[0]).toBe(7);
  });

  it("blocks a new import layer at MAX_LAYERS and still allows the active layer", () => {
    const layers = Array.from({ length: MAX_LAYERS }, (_, index) =>
      createLayer({ name: `Слой ${index + 1}` }),
    );
    __resetEditorCanvasStoreForTests({ layers, activeLayerId: layers[0]!.id });

    const placed = placeNativeGrid(nativeRedPixel(), 1, 1, "top-left");
    const blocked = useEditorCanvasStore.getState().importPixels(placed.pixels, "new-layer");
    expect(blocked).toEqual({ ok: false, reason: `Максимум ${MAX_LAYERS} слоёв` });
    expect(useEditorCanvasStore.getState().layers).toHaveLength(MAX_LAYERS);

    expect(useEditorCanvasStore.getState().importPixels(placed.pixels, "active").ok).toBe(true);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(MAX_LAYERS);
    expect(useEditorCanvasStore.getState().getActiveLayer()!.pixels[0]).toBe(255);
  });

  it("does not create a layer when the buffer size is wrong", () => {
    const result = useEditorCanvasStore.getState().importPixels(createEmptyPixels(2, 2), "new-layer");
    expect(result.ok).toBe(false);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(1);
    expect(placedByteLength()).toBe(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
  });
});

function placedByteLength(): number {
  return useEditorCanvasStore.getState().getActiveLayer()!.pixels.length;
}
