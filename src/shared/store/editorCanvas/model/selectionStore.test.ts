import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "./editorCanvasStore";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { createEmptyMask, fillRect } from "./selectionMask";

describe("selection store API", () => {
  beforeEach(() => {
    __resetEditorCanvasStoreForTests();
  });

  it("commits a rect draft and clears empty subtract", () => {
    const store = useEditorCanvasStore.getState();
    store.beginSelectionDraft({
      kind: "rect",
      x0: 2,
      y0: 2,
      x1: 5,
      y1: 5,
      constrainSquare: false,
      opMode: "replace",
    });
    store.commitSelectionDraft();
    expect(useEditorCanvasStore.getState().selectionMask).not.toBeNull();
    expect(useEditorCanvasStore.getState().selectionDraft).toBeNull();

    store.beginSelectionDraft({
      kind: "rect",
      x0: 0,
      y0: 0,
      x1: 159,
      y1: 159,
      constrainSquare: false,
      opMode: "subtract",
    });
    store.commitSelectionDraft();
    expect(useEditorCanvasStore.getState().selectionMask).toBeNull();
  });

  it("starts float, cancels restore, commits with one undo", () => {
    const store = useEditorCanvasStore.getState();
    const layer = store.getActiveLayer()!;
    // Paint one pixel
    layer.pixels[(10 * CANVAS_WIDTH + 10) * 4] = 255;
    layer.pixels[(10 * CANVAS_WIDTH + 10) * 4 + 3] = 255;

    const mask = createEmptyMask(CANVAS_WIDTH, CANVAS_HEIGHT);
    fillRect(mask, CANVAS_WIDTH, CANVAS_HEIGHT, 10, 10, 10, 10);
    useEditorCanvasStore.setState({ selectionMask: mask });

    expect(store.startFloatFromSelection()).toBe(true);
    const mid = useEditorCanvasStore.getState();
    expect(mid.floatSession).not.toBeNull();
    expect(mid.getActiveLayer()!.pixels[(10 * CANVAS_WIDTH + 10) * 4 + 3]).toBe(0);

    mid.cancelFloat();
    const afterCancel = useEditorCanvasStore.getState();
    expect(afterCancel.floatSession).toBeNull();
    expect(afterCancel.getActiveLayer()!.pixels[(10 * CANVAS_WIDTH + 10) * 4]).toBe(255);
    expect(afterCancel.selectionMask).not.toBeNull();

    afterCancel.startFloatFromSelection();
    const floating = useEditorCanvasStore.getState();
    floating.updateFloatTransform({
      ...floating.floatSession!.transform,
      x: 12,
      y: 12,
    });
    const undoBefore = floating.getActiveUndoDepth();
    floating.commitFloat();
    const after = useEditorCanvasStore.getState();
    expect(after.floatSession).toBeNull();
    expect(after.getActiveUndoDepth()).toBe(undoBefore + 1);
    expect(after.getActiveLayer()!.pixels[(12 * CANVAS_WIDTH + 12) * 4]).toBe(255);
  });

  it("copy cut paste and delete follow Idle/float contracts", () => {
    const store = useEditorCanvasStore.getState();
    const layer = store.getActiveLayer()!;
    layer.pixels[(5 * CANVAS_WIDTH + 5) * 4] = 10;
    layer.pixels[(5 * CANVAS_WIDTH + 5) * 4 + 1] = 20;
    layer.pixels[(5 * CANVAS_WIDTH + 5) * 4 + 2] = 30;
    layer.pixels[(5 * CANVAS_WIDTH + 5) * 4 + 3] = 255;

    const mask = createEmptyMask(CANVAS_WIDTH, CANVAS_HEIGHT);
    fillRect(mask, CANVAS_WIDTH, CANVAS_HEIGHT, 5, 5, 5, 5);
    useEditorCanvasStore.setState({ selectionMask: mask });

    store.copySelection();
    expect(useEditorCanvasStore.getState().selectionClipboard).not.toBeNull();

    store.cutSelection();
    let s = useEditorCanvasStore.getState();
    expect(s.selectionMask).toBeNull();
    expect(s.floatSession).toBeNull();
    expect(s.getActiveLayer()!.pixels[(5 * CANVAS_WIDTH + 5) * 4 + 3]).toBe(0);

    store.pasteClipboard();
    s = useEditorCanvasStore.getState();
    expect(s.floatSession).not.toBeNull();

    s.deleteSelection();
    s = useEditorCanvasStore.getState();
    expect(s.floatSession).toBeNull();
    expect(s.selectionMask).toBeNull();
  });

  it("Ctrl+Z while floating cancels without popping undo", () => {
    const store = useEditorCanvasStore.getState();
    const layer = store.getActiveLayer()!;
    layer.pixels[0] = 1;
    layer.pixels[3] = 255;
    const mask = createEmptyMask(CANVAS_WIDTH, CANVAS_HEIGHT);
    fillRect(mask, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, 0, 0);
    useEditorCanvasStore.setState({ selectionMask: mask });
    store.startFloatFromSelection();
    const depth = useEditorCanvasStore.getState().getActiveUndoDepth();
    useEditorCanvasStore.getState().undo();
    const after = useEditorCanvasStore.getState();
    expect(after.floatSession).toBeNull();
    expect(after.getActiveUndoDepth()).toBe(depth);
    expect(after.getActiveLayer()!.pixels[0]).toBe(1);
  });
});
