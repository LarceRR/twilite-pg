import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import {
  __resetEditorPaletteStoreForTests,
  useEditorPaletteStore,
} from "@/shared/store/editorPalette";
import { confirm } from "@/shared/ui/Confirm";
import { EditorWorkingPalette } from "./EditorWorkingPalette";

vi.mock("@/shared/ui/Confirm", () => ({
  confirm: vi.fn(),
}));

describe("EditorWorkingPalette", () => {
  beforeEach(() => {
    __resetEditorCanvasStoreForTests();
    __resetEditorPaletteStoreForTests();
    vi.mocked(confirm).mockReset();
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

  it("clears the palette after confirmation", async () => {
    useEditorPaletteStore.getState().addColor("#00ff00", "picker");
    vi.mocked(confirm).mockResolvedValue(true);
    render(<EditorWorkingPalette />);

    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    expect(confirm).toHaveBeenCalledWith("Очистить палитру?");
    await waitFor(() => {
      expect(useEditorPaletteStore.getState().colors).toHaveLength(0);
    });
  });

  it("keeps the palette when confirmation is cancelled", async () => {
    useEditorPaletteStore.getState().addColor("#00ff00", "picker");
    vi.mocked(confirm).mockResolvedValue(false);
    render(<EditorWorkingPalette />);

    fireEvent.click(screen.getByRole("button", { name: "Очистить" }));
    await waitFor(() => {
      expect(confirm).toHaveBeenCalled();
    });
    expect(useEditorPaletteStore.getState().colors).toHaveLength(1);
  });
});
