import { beforeEach, describe, expect, it } from "vitest";
import { MAX_LAYERS } from "./constants";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "./editorCanvasStore";
import { createLayer, resetLayerIdSequence } from "./layerFactory";
import { hexToRgba } from "./color";
import { setPixel } from "./pixels";

describe("editorCanvasStore layers", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
  });

  it("starts with one drawable layer", () => {
    const state = useEditorCanvasStore.getState();
    expect(state.layers).toHaveLength(1);
    expect(state.isActiveLayerDrawable()).toBe(true);
  });

  it("respects MAX_LAYERS", () => {
    for (let i = 1; i < MAX_LAYERS; i += 1) {
      expect(useEditorCanvasStore.getState().addLayer().ok).toBe(true);
    }
    const blocked = useEditorCanvasStore.getState().addLayer();
    expect(blocked.ok).toBe(false);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(MAX_LAYERS);
  });

  it("refuses deleting the last layer", () => {
    const id = useEditorCanvasStore.getState().activeLayerId;
    const result = useEditorCanvasStore.getState().deleteLayer(id);
    expect(result.ok).toBe(false);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(1);
  });

  it("keeps undo stacks isolated per layer", () => {
    const store = useEditorCanvasStore.getState();
    const firstId = store.activeLayerId;
    expect(store.addLayer().ok).toBe(true);
    const secondId = useEditorCanvasStore.getState().activeLayerId;

    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#ff0000"),
        size: 1,
      }),
    ).toBe(true);
    useEditorCanvasStore.getState().paintAt(1, 1);
    useEditorCanvasStore.getState().endStroke();

    useEditorCanvasStore.getState().setActiveLayer(firstId);
    expect(useEditorCanvasStore.getState().canUndo()).toBe(false);

    useEditorCanvasStore.getState().setActiveLayer(secondId);
    expect(useEditorCanvasStore.getState().canUndo()).toBe(true);
    useEditorCanvasStore.getState().undo();
    expect(useEditorCanvasStore.getState().canUndo()).toBe(false);
    expect(useEditorCanvasStore.getState().canRedo()).toBe(true);
  });

  it("rejects paint on locked layer", () => {
    const id = useEditorCanvasStore.getState().activeLayerId;
    useEditorCanvasStore.getState().setLayerLocked(id, true);
    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#ff0000"),
        size: 1,
      }),
    ).toBe(false);
  });

  it("blocks active layer switch while drawing", () => {
    expect(useEditorCanvasStore.getState().addLayer().ok).toBe(true);
    const secondId = useEditorCanvasStore.getState().activeLayerId;
    const layers = useEditorCanvasStore.getState().layers;
    const firstId = layers[0]!.id;

    useEditorCanvasStore.getState().setActiveLayer(firstId);
    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#ff0000"),
        size: 1,
      }),
    ).toBe(true);
    const blocked = useEditorCanvasStore.getState().setActiveLayer(secondId);
    expect(blocked.ok).toBe(false);
    useEditorCanvasStore.getState().endStroke();
  });

  it("composites for export image data", () => {
    const bottom = createLayer({ name: "Bottom" });
    bottom.pixels[0] = 0;
    bottom.pixels[1] = 0;
    bottom.pixels[2] = 255;
    bottom.pixels[3] = 255;

    const top = createLayer({ name: "Top" });
    top.pixels[0] = 255;
    top.pixels[1] = 0;
    top.pixels[2] = 0;
    top.pixels[3] = 255;
    top.opacity = 0.5;

    __resetEditorCanvasStoreForTests({
      layers: [bottom, top],
      activeLayerId: top.id,
    });

    const pixels = useEditorCanvasStore.getState().getCompositePixels();
    expect(pixels.length).toBe(160 * 160 * 4);
    expect(pixels[0]).toBeGreaterThan(100);
    expect(pixels[2]).toBeGreaterThan(100);
  });

  it("uses max coverage for overlapping soft stamps in one stroke", () => {
    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#ffffff"),
        size: 5,
        shape: "circle",
        softness: 100,
      }),
    ).toBe(true);
    useEditorCanvasStore.getState().paintAt(5, 5);
    useEditorCanvasStore.getState().paintAt(5, 5);
    useEditorCanvasStore.getState().endStroke();

    const layer = useEditorCanvasStore.getState().getActiveLayer()!;
    const a = layer.pixels[(5 * 160 + 5) * 4 + 3]!;
    expect(a).toBeLessThanOrEqual(255);
    expect(a).toBeGreaterThan(0);
  });

  it("replaces the previous line preview instead of accumulating it", () => {
    const store = useEditorCanvasStore.getState();
    expect(
      store.beginStroke({
        rgba: hexToRgba("#ff0000"),
        size: 1,
        shape: "circle",
      }),
    ).toBe(true);

    store.previewStrokeSegment(1, 1, 3, 1);
    let pixels = useEditorCanvasStore.getState().getActiveLayer()!.pixels;
    expect(pixels[(1 * 160 + 3) * 4 + 3]).toBe(255);

    useEditorCanvasStore.getState().previewStrokeSegment(1, 1, 1, 3);
    pixels = useEditorCanvasStore.getState().getActiveLayer()!.pixels;
    expect(pixels[(1 * 160 + 3) * 4 + 3]).toBe(0);
    expect(pixels[(3 * 160 + 1) * 4 + 3]).toBe(255);

    useEditorCanvasStore.getState().endStroke();
    expect(useEditorCanvasStore.getState().getActiveUndoDepth()).toBe(1);
  });

  it("cancels a line preview without consuming undo or redo history", () => {
    const store = useEditorCanvasStore.getState();
    store.beginStroke({ rgba: hexToRgba("#ff0000"), size: 1 });
    store.paintAt(2, 2);
    store.endStroke();
    useEditorCanvasStore.getState().undo();
    expect(useEditorCanvasStore.getState().canRedo()).toBe(true);

    useEditorCanvasStore.getState().beginStroke({
      rgba: hexToRgba("#00ff00"),
      size: 1,
      shape: "circle",
    });
    useEditorCanvasStore.getState().previewStrokeSegment(1, 1, 4, 1);
    useEditorCanvasStore.getState().cancelStroke();

    const state = useEditorCanvasStore.getState();
    expect(state.isDrawing).toBe(false);
    expect(state.getActiveUndoDepth()).toBe(0);
    expect(state.canRedo()).toBe(true);
    expect(state.getActiveLayer()!.pixels[(1 * 160 + 4) * 4 + 3]).toBe(0);
  });

  it("fills only the active layer and restores it with one undo step", () => {
    const store = useEditorCanvasStore.getState();
    const layer = store.getActiveLayer()!;
    const red = hexToRgba("#ff0000");
    for (let x = 10; x <= 14; x += 1) {
      setPixel(layer.pixels, 160, 160, x, 10, red);
      setPixel(layer.pixels, 160, 160, x, 14, red);
    }
    for (let y = 11; y <= 13; y += 1) {
      setPixel(layer.pixels, 160, 160, 10, y, red);
      setPixel(layer.pixels, 160, 160, 14, y, red);
    }

    const result = useEditorCanvasStore.getState().fillAt(12, 12, hexToRgba("#0000ff"));
    expect(result).toEqual({ ok: true, filledPixels: 9 });

    const filled = useEditorCanvasStore.getState().getActiveLayer()!.pixels;
    expect(filled[(12 * 160 + 12) * 4 + 2]).toBe(255);
    expect(filled[(9 * 160 + 12) * 4 + 3]).toBe(0);
    expect(useEditorCanvasStore.getState().getActiveUndoDepth()).toBe(1);

    useEditorCanvasStore.getState().undo();
    const restored = useEditorCanvasStore.getState().getActiveLayer()!.pixels;
    expect(restored[(12 * 160 + 12) * 4 + 3]).toBe(0);
    expect(restored[(10 * 160 + 10) * 4]).toBe(255);
  });

  it("does not push undo when the fill color matches the seed", () => {
    const layer = useEditorCanvasStore.getState().getActiveLayer()!;
    setPixel(layer.pixels, 160, 160, 4, 4, hexToRgba("#ff0000"));
    const result = useEditorCanvasStore.getState().fillAt(4, 4, hexToRgba("#ff0000"));
    expect(result).toEqual({ ok: true, filledPixels: 0 });
    expect(useEditorCanvasStore.getState().getActiveUndoDepth()).toBe(0);
  });

  it("rejects fill on a locked layer", () => {
    const id = useEditorCanvasStore.getState().activeLayerId;
    useEditorCanvasStore.getState().setLayerLocked(id, true);
    const result = useEditorCanvasStore.getState().fillAt(0, 0, hexToRgba("#ff0000"));
    expect(result.ok).toBe(false);
    expect(useEditorCanvasStore.getState().getActiveUndoDepth()).toBe(0);
    expect(useEditorCanvasStore.getState().getActiveLayer()!.pixels[3]).toBe(0);
  });
});
