import { useRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetEditorViewportStoreForTests,
  useEditorViewportStore,
} from "@/shared/store/editorViewport";
import { useEditorViewportInteractions } from "./useEditorViewportInteractions";

function Harness({ width = 700, height = 540 }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const interactions = useEditorViewportInteractions(viewportRef, "Brush");

  return (
    <div
      ref={(element) => {
        viewportRef.current = element;
        if (element) {
          Object.defineProperties(element, {
            clientWidth: { configurable: true, value: width },
            clientHeight: { configurable: true, value: height },
          });
        }
      }}
      data-testid="viewport"
    >
      <button type="button" onClick={interactions.resetToFit}>
        Fit
      </button>
    </div>
  );
}

describe("useEditorViewportInteractions", () => {
  beforeEach(() => {
    __resetEditorViewportStoreForTests();
  });

  afterEach(() => {
    cleanup();
  });

  it("intercepts Ctrl+wheel over the viewport and zooms toward the cursor", () => {
    render(<Harness />);
    useEditorViewportStore.getState().setViewportSize(700, 540);
    const viewport = screen.getByTestId("viewport");
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 350,
      clientY: 270,
      ctrlKey: true,
      deltaY: -100,
    });

    fireEvent(viewport, event);

    expect(event.defaultPrevented).toBe(true);
    expect(useEditorViewportStore.getState().zoom).toBe(8);
  });

  it("remeasures the viewport before fitting the canvas", () => {
    useEditorViewportStore.getState().setViewportSize(500, 400);
    useEditorViewportStore.getState().zoomTo(8, { x: 250, y: 200 });
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Fit" }));

    expect(useEditorViewportStore.getState()).toMatchObject({
      viewportWidth: 700,
      viewportHeight: 540,
      zoom: 7,
      panX: 105,
      panY: 25,
    });
  });
});
