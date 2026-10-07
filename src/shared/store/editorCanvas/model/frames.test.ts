import { beforeEach, describe, expect, it } from "vitest";
import { captureExportFrames } from "@/shared/pixelObject/capture";
import { MAX_FRAMES } from "@/shared/pixelObject/constants";
import { hexToRgba } from "./color";
import { CANVAS_WIDTH } from "./constants";
import { __resetEditorCanvasStoreForTests, useEditorCanvasStore } from "./editorCanvasStore";
import { resetLayerIdSequence } from "./layerFactory";

const PIXEL_X = 4;
const PIXEL_Y = 5;

function alphaAt(pixels: Uint8ClampedArray, x = PIXEL_X, y = PIXEL_Y): number {
  return pixels[(y * CANVAS_WIDTH + x) * 4 + 3] ?? 0;
}

function paintDot(): void {
  expect(
    useEditorCanvasStore.getState().beginStroke({
      rgba: hexToRgba("#ff0000"),
      size: 1,
      softness: 0,
    }),
  ).toBe(true);
  expect(useEditorCanvasStore.getState().paintAt(PIXEL_X, PIXEL_Y)).toBe(true);
  useEditorCanvasStore.getState().endStroke();
}

describe("editor frames", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
  });

  it("starts on one frame and refuses to delete it", () => {
    const state = useEditorCanvasStore.getState();
    expect(state.frames).toHaveLength(1);
    expect(state.deleteFrame(state.activeFrameId).ok).toBe(false);
    expect(useEditorCanvasStore.getState().frames).toHaveLength(1);
  });

  it("copies the current frame, then keeps later paint on the new frame only", () => {
    paintDot();
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    const secondId = useEditorCanvasStore.getState().activeFrameId;
    expect(alphaAt(useEditorCanvasStore.getState().getCompositePixels())).toBe(255);

    const firstId = useEditorCanvasStore.getState().frames[0]!.id;
    useEditorCanvasStore.getState().setActiveFrame(firstId);
    expect(alphaAt(useEditorCanvasStore.getState().getCompositePixels())).toBe(255);
    expect(secondId).not.toBe(firstId);
  });

  it("paints the active frame without changing the previous one", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    const secondId = useEditorCanvasStore.getState().activeFrameId;
    const firstId = useEditorCanvasStore.getState().frames[0]!.id;
    paintDot();
    expect(alphaAt(useEditorCanvasStore.getState().getCompositePixels())).toBe(255);

    useEditorCanvasStore.getState().setActiveFrame(firstId);
    expect(alphaAt(useEditorCanvasStore.getState().getCompositePixels())).toBe(0);
    expect(useEditorCanvasStore.getState().canUndo()).toBe(false);

    useEditorCanvasStore.getState().setActiveFrame(secondId);
    expect(alphaAt(useEditorCanvasStore.getState().getCompositePixels())).toBe(255);
    expect(useEditorCanvasStore.getState().canUndo()).toBe(true);
  });

  it("gives a new layer an empty cel on the other frames", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    const secondId = useEditorCanvasStore.getState().activeFrameId;
    const firstId = useEditorCanvasStore.getState().frames[0]!.id;
    expect(useEditorCanvasStore.getState().addLayer().ok).toBe(true);
    paintDot();

    useEditorCanvasStore.getState().setActiveFrame(firstId);
    expect(alphaAt(useEditorCanvasStore.getState().getCompositePixels())).toBe(0);
    useEditorCanvasStore.getState().setActiveFrame(secondId);
    expect(alphaAt(useEditorCanvasStore.getState().getCompositePixels())).toBe(255);
  });

  it("stops at MAX_FRAMES", () => {
    for (let index = 1; index < MAX_FRAMES; index += 1) {
      expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    }
    expect(useEditorCanvasStore.getState().frames).toHaveLength(MAX_FRAMES);
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(false);
  });

  it("reorders a frame to another index", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    const ids = useEditorCanvasStore.getState().frames.map((frame) => frame.id);
    expect(useEditorCanvasStore.getState().reorderFrame(0, 2).ok).toBe(true);
    expect(useEditorCanvasStore.getState().frames.map((frame) => frame.id)).toEqual([
      ids[1],
      ids[2],
      ids[0],
    ]);
    expect(useEditorCanvasStore.getState().reorderFrame(1, 1).ok).toBe(true);
    expect(useEditorCanvasStore.getState().reorderFrame(-1, 0).ok).toBe(false);
  });

  it("refuses to reorder during a stroke", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#00ff00"),
        size: 1,
      }),
    ).toBe(true);
    expect(useEditorCanvasStore.getState().reorderFrame(0, 1).ok).toBe(false);
    useEditorCanvasStore.getState().endStroke();
  });

  it("clamps frame duration", () => {
    const id = useEditorCanvasStore.getState().activeFrameId;
    useEditorCanvasStore.getState().setFrameDuration(id, 1);
    expect(useEditorCanvasStore.getState().frames[0]?.durationMs).toBe(16);
    useEditorCanvasStore.getState().setFrameDuration(id, 50_000);
    expect(useEditorCanvasStore.getState().frames[0]?.durationMs).toBe(10_000);
  });

  it("blocks a frame change during a stroke", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    const secondId = useEditorCanvasStore.getState().activeFrameId;
    const firstId = useEditorCanvasStore.getState().frames[0]!.id;
    useEditorCanvasStore.getState().setActiveFrame(firstId);
    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#00ff00"),
        size: 1,
      }),
    ).toBe(true);
    expect(useEditorCanvasStore.getState().setActiveFrame(secondId).ok).toBe(false);
    useEditorCanvasStore.getState().endStroke();
  });

  it("shows the next frame through onion skin and hides it when onion skin is off", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    paintDot();
    const firstId = useEditorCanvasStore.getState().frames[0]!.id;
    useEditorCanvasStore.getState().setActiveFrame(firstId);
    expect(useEditorCanvasStore.getState().getNeighborComposite(1)).toBeNull();
    useEditorCanvasStore.getState().toggleOnionSkin();
    const next = useEditorCanvasStore.getState().getNeighborComposite(1);
    expect(next).not.toBeNull();
    expect(alphaAt(next!)).toBe(255);
    expect(useEditorCanvasStore.getState().getNeighborComposite(-1)).toBeNull();
  });

  it("exports every composited frame", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    paintDot();
    const packed = captureExportFrames();
    expect(packed.frames).toHaveLength(2);
    expect(alphaAt(packed.frames[0]!.pixels)).toBe(0);
    expect(alphaAt(packed.frames[1]!.pixels)).toBe(255);
  });

  it("does not paint while the preview is playing", () => {
    useEditorCanvasStore.getState().playPreview();
    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#ff0000"),
        size: 1,
      }),
    ).toBe(false);
    useEditorCanvasStore.getState().pausePlayback();
    expect(
      useEditorCanvasStore.getState().beginStroke({
        rgba: hexToRgba("#ff0000"),
        size: 1,
      }),
    ).toBe(true);
    useEditorCanvasStore.getState().endStroke();
  });
});
