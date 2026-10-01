import { describe, expect, it } from "vitest";
import { hexToRgba } from "./color";

describe("hexToRgba", () => {
  it("parses short and long hex", () => {
    expect(hexToRgba("#f00")).toEqual([255, 0, 0, 255]);
    expect(hexToRgba("#00ff00")).toEqual([0, 255, 0, 255]);
    expect(hexToRgba("#0000ff80")).toEqual([0, 0, 255, 128]);
  });

  it("falls back for invalid input", () => {
    expect(hexToRgba("not-a-color")).toEqual([0, 0, 0, 255]);
  });
});
