import { beforeEach, describe, expect, it } from "vitest";
import { __resetEditorViewportStoreForTests, useEditorViewportStore } from "./editorViewportStore";

describe("editorViewportStore", () => {
  beforeEach(() => {
    __resetEditorViewportStoreForTests();
  });

  it("initializes with a centered integer fit", () => {
    useEditorViewportStore.getState().setViewportSize(700, 540);

    expect(useEditorViewportStore.getState()).toMatchObject({
      initialized: true,
      viewportWidth: 700,
      viewportHeight: 540,
      zoom: 7,
      panX: 105,
      panY: 25,
    });
  });

  it("zooms toward the supplied viewport point", () => {
    useEditorViewportStore.getState().setViewportSize(700, 540);
    const anchor = { x: 250, y: 180 };
    const before = useEditorViewportStore.getState();
    const worldX = (anchor.x - before.panX) / before.zoom;
    const worldY = (anchor.y - before.panY) / before.zoom;

    useEditorViewportStore.getState().zoomBy(1, anchor);
    const after = useEditorViewportStore.getState();

    expect(after.zoom).toBe(8);
    expect(Math.abs(worldX * after.zoom + after.panX - anchor.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(worldY * after.zoom + after.panY - anchor.y)).toBeLessThanOrEqual(0.5);
  });

  it("clamps pan and restores fit", () => {
    useEditorViewportStore.getState().setViewportSize(500, 400);
    useEditorViewportStore.getState().zoomTo(4, { x: 250, y: 200 });
    useEditorViewportStore.getState().panBy(10_000, 10_000);

    expect(useEditorViewportStore.getState()).toMatchObject({
      zoom: 4,
      panX: 436,
      panY: 336,
    });

    useEditorViewportStore.getState().resetToFit();
    expect(useEditorViewportStore.getState()).toMatchObject({
      zoom: 5,
      panX: 75,
      panY: 25,
    });
  });
});
