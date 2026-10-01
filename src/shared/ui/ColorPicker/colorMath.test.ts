import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex, normalizeHex, tryParsePartialHex } from "./colorMath";

describe("normalizeHex", () => {
  it("expands #rgb and lowercases", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("abc")).toBe("#aabbcc");
  });

  it("falls back to black for invalid input", () => {
    expect(normalizeHex("rebeccapurple")).toBe("#000000");
    expect(normalizeHex("#rrggbb")).toBe("#000000");
  });
});

describe("hsv round trip", () => {
  it("preserves hex for saturated colors", () => {
    expect(hsvToHex(hexToHsv("#1b55e0"))).toBe("#1b55e0");
  });

  it("maps all hues at zero brightness to black", () => {
    const black = hexToHsv("#000000");
    expect(hsvToHex({ h: 200, s: 100, v: black.v })).toBe("#000000");
  });
});

describe("tryParsePartialHex", () => {
  it("accepts six hex digits only when complete", () => {
    expect(tryParsePartialHex("1B55E0")).toBe("#1b55e0");
    expect(tryParsePartialHex("1B55")).toBeNull();
    expect(tryParsePartialHex("GGGGGG")).toBeNull();
  });
});
