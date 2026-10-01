import { describe, expect, it } from "vitest";
import { canonicalizePaletteHex, insertPaletteColor, type PaletteColor } from "./paletteColor";

function hexes(colors: PaletteColor[]): string[] {
  return colors.map((color) => color.hex);
}

describe("canonicalizePaletteHex", () => {
  it("canonicalizes to lowercase #rrggbb and drops transparent input", () => {
    expect(canonicalizePaletteHex("#F00")).toBe("#ff0000");
    expect(canonicalizePaletteHex("#AaBbCc")).toBe("#aabbcc");
    expect(canonicalizePaletteHex("#11223380")).toBe("#112233");
    expect(canonicalizePaletteHex("#11223300")).toBeNull();
    expect(canonicalizePaletteHex("nope")).toBeNull();
  });
});

describe("insertPaletteColor", () => {
  it("dedups and keeps the original source", () => {
    const once = insertPaletteColor([], "#FF0000", "picker", 64, 1);
    const twice = insertPaletteColor(once, "#ff0000", "canvas", 64, 2);
    expect(hexes(twice)).toEqual(["#ff0000"]);
    expect(twice[0]).toMatchObject({ source: "picker", lastUsedAt: 2 });
  });

  it("evicts the least recently used color past maxColors", () => {
    let colors: PaletteColor[] = [];
    colors = insertPaletteColor(colors, "#aa0000", "picker", 3, 1);
    colors = insertPaletteColor(colors, "#00aa00", "picker", 3, 2);
    colors = insertPaletteColor(colors, "#0000aa", "picker", 3, 3);
    colors = insertPaletteColor(colors, "#aa0000", "canvas", 3, 4);
    colors = insertPaletteColor(colors, "#ffffff", "picker", 3, 5);
    expect(hexes(colors)).toEqual(["#0000aa", "#aa0000", "#ffffff"]);
  });

  it("keeps a near shade on the existing swatch", () => {
    const colors = insertPaletteColor(
      [{ hex: "#ff0000", lastUsedAt: 1, source: "canvas" }],
      "#f00000",
      "canvas",
      64,
      2,
    );
    expect(hexes(colors)).toEqual(["#ff0000"]);
    expect(colors[0]?.lastUsedAt).toBe(2);
  });

  it("adds a shade once a channel moves past the threshold", () => {
    const colors = insertPaletteColor(
      [{ hex: "#000000", lastUsedAt: 1, source: "canvas" }],
      "#111111",
      "canvas",
      64,
      2,
    );
    expect(hexes(colors)).toEqual(["#000000", "#111111"]);
  });

  it("merges import colors without storing transparent or overflowing the cap", () => {
    let colors: PaletteColor[] = [];
    for (const hex of ["#ff0000", "#00ff00", "#0000ff00", "#0000ff", "#ffffff"]) {
      colors = insertPaletteColor(colors, hex, "import", 3);
    }
    expect(colors).toHaveLength(3);
    expect(colors.every((color) => color.source === "import")).toBe(true);
    expect(hexes(colors)).not.toContain("#0000ff00");
    expect(hexes(colors)).toContain("#ffffff");
  });
});
