import { beforeEach, describe, expect, it } from "vitest";
import { captureExportFrames } from "./capture";
import {
  activeFrameIndexFromIds,
  selectActiveExportFrame,
} from "./selectActiveExportFrame";
import { hexToRgba } from "@/shared/store/editorCanvas/model/color";
import { CANVAS_WIDTH } from "@/shared/store/editorCanvas/model/constants";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas/model/editorCanvasStore";
import { resetLayerIdSequence } from "@/shared/store/editorCanvas/model/layerFactory";

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

describe("selectActiveExportFrame", () => {
  it("returns undefined for an empty list", () => {
    expect(selectActiveExportFrame([], 0)).toBeUndefined();
  });

  it("returns the frame at activeIndex", () => {
    const frames = [
      { pixels: new Uint8ClampedArray([1]), durationMs: 100 },
      { pixels: new Uint8ClampedArray([2]), durationMs: 100 },
    ];
    expect(selectActiveExportFrame(frames, 1)?.pixels[0]).toBe(2);
  });

  it("falls back to frame 0 when activeIndex is out of range", () => {
    const frames = [{ pixels: new Uint8ClampedArray([9]), durationMs: 100 }];
    expect(selectActiveExportFrame(frames, 5)?.pixels[0]).toBe(9);
    expect(selectActiveExportFrame(frames, -1)?.pixels[0]).toBe(9);
  });

  it("resolves active index from frame ids", () => {
    expect(activeFrameIndexFromIds(["a", "b", "c"], "b")).toBe(1);
    expect(activeFrameIndexFromIds(["a", "b"], "missing")).toBe(0);
    expect(activeFrameIndexFromIds(["a"], null)).toBe(0);
  });
});

describe("active frame PNG export selection", () => {
  beforeEach(() => {
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
  });

  it("exports the active frame pixels, not frames[0], when active is not the first", () => {
    expect(useEditorCanvasStore.getState().addFrame().ok).toBe(true);
    paintDot();
    const state = useEditorCanvasStore.getState();
    const secondId = state.activeFrameId;
    const firstId = state.frames[0]!.id;
    expect(secondId).not.toBe(firstId);

    const document = captureExportFrames();
    const ids = useEditorCanvasStore.getState().frames.map((frame) => frame.id);
    const activeIndex = activeFrameIndexFromIds(ids, secondId);
    const selected = selectActiveExportFrame(document.frames, activeIndex);

    expect(activeIndex).toBe(1);
    expect(alphaAt(document.frames[0]!.pixels)).toBe(0);
    expect(alphaAt(selected!.pixels)).toBe(255);
    expect(selected).toBe(document.frames[1]);
  });
});
