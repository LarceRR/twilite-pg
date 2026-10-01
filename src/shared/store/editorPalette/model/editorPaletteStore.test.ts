import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetEditorPaletteStoreForTests,
  useEditorPaletteStore,
} from "./editorPaletteStore";

describe("editorPaletteStore", () => {
  beforeEach(() => {
    __resetEditorPaletteStoreForTests({ maxColors: 3 });
  });

  it("dedups picker colors and ignores transparent input", () => {
    const store = useEditorPaletteStore.getState();
    expect(store.addColor("#FF0000", "picker")).toBe(true);
    expect(store.addColor("#ff0000", "canvas")).toBe(true);
    expect(useEditorPaletteStore.getState().addColor("#00000000", "import")).toBe(false);

    const colors = useEditorPaletteStore.getState().colors;
    expect(colors).toHaveLength(1);
    expect(colors[0]).toMatchObject({ hex: "#ff0000", source: "picker" });
  });

  it("merges import colors up to the cap", () => {
    useEditorPaletteStore
      .getState()
      .mergeColors(["#ff0000", "#00ff00", "#0000ff00", "#0000ff", "#ffffff"], "import");

    const colors = useEditorPaletteStore.getState().colors;
    expect(colors).toHaveLength(3);
    expect(colors.map((color) => color.hex)).toEqual(["#00ff00", "#0000ff", "#ffffff"]);
    expect(colors.every((color) => color.source === "import")).toBe(true);
  });
});
