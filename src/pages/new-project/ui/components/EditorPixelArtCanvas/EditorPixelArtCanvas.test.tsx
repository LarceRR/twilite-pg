import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import { EDITOR_TOOLS, useEditorSelectedToolStore } from "@/shared/store/editorSelectedTool";
import {
  __resetEditorViewportStoreForTests,
  useEditorViewportStore,
} from "@/shared/store/editorViewport";
import { EditorPixelArtCanvas } from "./EditorPixelArtCanvas";

class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  disconnect() {}
  unobserve() {}
}

describe("EditorPixelArtCanvas viewport and brush integration", () => {
  beforeEach(() => {
    __resetEditorCanvasStoreForTests();
    __resetEditorViewportStoreForTests();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("PointerEvent", MouseEvent);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(700);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(540);
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 110,
      top: 30,
      width: 480,
      height: 480,
      right: 590,
      bottom: 510,
      x: 110,
      y: 30,
      toJSON: () => ({}),
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
    HTMLCanvasElement.prototype.hasPointerCapture = vi.fn(() => true);
    HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();

    const brush = EDITOR_TOOLS.find((tool) => tool.name === "Brush")!;
    useEditorSelectedToolStore.getState().setCurrentTool(brush);
    useEditorSelectedToolStore.getState().updateToolProperty("Softness", 10);
    useEditorSelectedToolStore.getState().updateToolProperty("Size", 2);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("zooms with Ctrl+wheel and fits through the toolbar button", () => {
    const { container } = render(<EditorPixelArtCanvas />);
    const viewport = container.querySelector(".editor-pixel-art-canvas")!;

    fireEvent.wheel(viewport, {
      bubbles: true,
      cancelable: true,
      clientX: 350,
      clientY: 270,
      ctrlKey: true,
      deltaY: -100,
    });
    expect(useEditorViewportStore.getState().zoom).toBe(4);

    fireEvent.click(screen.getByRole("button", { name: "Вписать холст" }));
    expect(useEditorViewportStore.getState()).toMatchObject({
      zoom: 3,
      panX: 110,
      panY: 30,
    });
  });

  it("paints the complete 2x2 square brush footprint", () => {
    const { container } = render(<EditorPixelArtCanvas />);
    const canvas = container.querySelector("canvas")!;

    fireEvent.pointerDown(canvas, {
      button: 0,
      pointerId: 1,
      clientX: 110 + 40 * 3,
      clientY: 30 + 40 * 3,
    });
    fireEvent.pointerUp(canvas, { button: 0, pointerId: 1 });

    const pixels = useEditorCanvasStore.getState().getActiveLayer()!.pixels;
    let paintedPixels = 0;
    for (let offset = 3; offset < pixels.length; offset += 4) {
      if (pixels[offset]! > 0) {
        paintedPixels += 1;
      }
    }
    expect(paintedPixels).toBe(4);
  });
});
