import { describe, expect, it } from "vitest";

import { createEmptyPixels } from "./pixels";
import { __resetEditorCanvasStoreForTests, useEditorCanvasStore } from "./editorCanvasStore";
import { captureEditorDraft } from "./draftDocument";

describe("editor draft snapshot", () => {
  it("round-trips painted pixels without sharing the live buffer", () => {
    __resetEditorCanvasStoreForTests();
    const canvas = useEditorCanvasStore.getState();
    const pixels = createEmptyPixels(canvas.width, canvas.height);
    pixels[0] = 12;
    pixels[1] = 34;
    pixels[2] = 56;
    pixels[3] = 255;
    expect(canvas.importPixels(pixels, "active").ok).toBe(true);

    const snapshot = captureEditorDraft(useEditorCanvasStore.getState());
    const layerId = snapshot.layers[0]!.id;
    const stored = snapshot.frames[0]!.cels[layerId]!.pixels;
    useEditorCanvasStore.getState().layers[0]!.pixels[0] = 0;
    expect(stored[0]).toBe(12);

    useEditorCanvasStore.getState().resetDocument();
    expect(useEditorCanvasStore.getState().layers[0]!.pixels[3]).toBe(0);
    expect(useEditorCanvasStore.getState().loadDraft(snapshot)).toBe(true);

    const restored = useEditorCanvasStore.getState().layers[0]!.pixels;
    expect(restored[0]).toBe(12);
    expect(restored[1]).toBe(34);
    expect(restored[2]).toBe(56);
    expect(restored[3]).toBe(255);
  });

  it("rejects a snapshot with no layers", () => {
    __resetEditorCanvasStoreForTests();
    const snapshot = captureEditorDraft(useEditorCanvasStore.getState());
    expect(useEditorCanvasStore.getState().loadDraft({ ...snapshot, layers: [] })).toBe(false);
  });
});
