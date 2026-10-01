import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import {
  __resetEditorPaletteStoreForTests,
  useEditorPaletteStore,
} from "@/shared/store/editorPalette";
import { EditorWorkingPalette } from "./EditorWorkingPalette";

describe("EditorWorkingPalette", () => {
  beforeEach(() => {
    __resetEditorCanvasStoreForTests();
    __resetEditorPaletteStoreForTests();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows an empty state until a color is added", () => {
    render(<EditorWorkingPalette />);
    expect(screen.getByText("Нарисуйте цветом")).toBeInTheDocument();
  });

  it("assigns primary on click and secondary on right click", () => {
    useEditorPaletteStore.getState().addColor("#ff0000", "picker");
    render(<EditorWorkingPalette />);

    const swatch = screen.getByRole("button", { name: "#ff0000" });
    fireEvent.click(swatch);
    expect(useEditorCanvasStore.getState().primaryColor).toBe("#ff0000");

    fireEvent.contextMenu(swatch);
    expect(useEditorCanvasStore.getState().secondaryColor).toBe("#ff0000");
  });

  it("clears the palette after confirmation", () => {
    useEditorPaletteStore.getState().addColor("#00ff00", "picker");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<EditorWorkingPalette />);

    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(useEditorPaletteStore.getState().colors).toHaveLength(0);
  });
});
