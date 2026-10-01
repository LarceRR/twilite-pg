import { describe, expect, it } from "vitest";
import { clampToolAmount, parseToolAmount } from "./toolAmount";

describe("clampToolAmount", () => {
  it("clamps to min and max", () => {
    expect(clampToolAmount(-5, 0, 10)).toBe(0);
    expect(clampToolAmount(15, 0, 10)).toBe(10);
    expect(clampToolAmount(7, 0, 10)).toBe(7);
  });

  it("falls back when value is not finite", () => {
    expect(clampToolAmount(Number.NaN, 2, 8)).toBe(2);
    expect(clampToolAmount(Number.POSITIVE_INFINITY, 2, 8)).toBe(2);
  });

  it("swaps inverted bounds", () => {
    expect(clampToolAmount(5, 10, 0)).toBe(5);
  });
});

describe("parseToolAmount", () => {
  it("parses valid numbers and locale commas", () => {
    expect(parseToolAmount("12", 0, 100, 1)).toBe(12);
    expect(parseToolAmount("4,5", 0, 20, 1)).toBe(4.5);
  });

  it("keeps fallback for incomplete or invalid input", () => {
    expect(parseToolAmount("", 0, 100, 7)).toBe(7);
    expect(parseToolAmount("-", 0, 100, 7)).toBe(7);
    expect(parseToolAmount("abc", 0, 100, 7)).toBe(7);
  });

  it("clamps parsed values to the property range", () => {
    expect(parseToolAmount("999", 0, 20, 4)).toBe(20);
    expect(parseToolAmount("-3", 0, 20, 4)).toBe(0);
  });
});
