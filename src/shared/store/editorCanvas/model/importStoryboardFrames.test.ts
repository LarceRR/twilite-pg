import { beforeEach, describe, expect, it } from "vitest";
import { MAX_FRAMES } from "@/shared/pixelObject/constants";
import { __resetEditorCanvasStoreForTests, useEditorCanvasStore } from "./editorCanvasStore";
import { CANVAS_BYTE_LENGTH } from "./constants";
import { resetLayerIdSequence } from "./layerFactory";
import { createEmptyPixels } from "./pixels";

function opaqueFrame(byte = 255): Uint8ClampedArray {
  const pixels = createEmptyPixels(160, 160);
  pixels[0] = byte;
  pixels[3] = 255;
  return pixels;
}

describe("importStoryboardFrames", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
  });

  it("applies frame duration to imported frames", () => {
    const result = useEditorCanvasStore.getState().importStoryboardFrames([opaqueFrame()], "replace", 250);
    expect(result.ok).toBe(true);
    expect(useEditorCanvasStore.getState().frames[0]?.durationMs).toBe(250);
  });

  it("replace leaves one storyboard layer and N frames", () => {
    useEditorCanvasStore.getState().addFrame();
    const result = useEditorCanvasStore.getState().importStoryboardFrames(
      [opaqueFrame(10), opaqueFrame(20)],
      "replace",
    );
    expect(result.ok).toBe(true);
    const state = useEditorCanvasStore.getState();
    expect(state.frames).toHaveLength(2);
    expect(state.layers).toHaveLength(1);
    expect(state.layers[0]?.name).toBe("Раскадровка");
    expect(state.activeFrameId).toBe(state.frames[0]?.id);
    expect(state.getActiveLayer()?.pixels[0]).toBe(10);
    useEditorCanvasStore.getState().setActiveFrame(state.frames[1]!.id);
    expect(useEditorCanvasStore.getState().getActiveLayer()?.pixels[0]).toBe(20);
  });

  it("append keeps existing layers and adds frames at end", () => {
    const beforeLayers = useEditorCanvasStore.getState().layers.length;
    useEditorCanvasStore.getState().addFrame();
    const result = useEditorCanvasStore.getState().importStoryboardFrames([opaqueFrame()], "append");
    expect(result.ok).toBe(true);
    const state = useEditorCanvasStore.getState();
    expect(state.frames).toHaveLength(3);
    expect(state.layers).toHaveLength(beforeLayers + 1);
    expect(state.layers[state.layers.length - 1]?.name).toBe("Раскадровка");
  });

  it("rejects append when over MAX_FRAMES", () => {
    for (let i = 0; i < MAX_FRAMES - 1; i += 1) {
      expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    }
    const blocked = useEditorCanvasStore.getState().importStoryboardFrames([opaqueFrame()], "append");
    expect(blocked.ok).toBe(false);
  });

  it("validates buffer size", () => {
    const bad = new Uint8ClampedArray(8);
    const result = useEditorCanvasStore.getState().importStoryboardFrames([bad], "replace");
    expect(result.ok).toBe(false);
    expect(opaqueFrame().length).toBe(CANVAS_BYTE_LENGTH);
  });
});
