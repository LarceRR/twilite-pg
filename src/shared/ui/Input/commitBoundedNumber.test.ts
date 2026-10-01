import { describe, expect, it } from "vitest";
import { commitBoundedNumber, parseInRange } from "./commitBoundedNumber";

describe("parseInRange", () => {
  it("keeps a below-minimum prefix so the next digit can be typed", () => {
    expect(parseInRange("5", 16, 10_000)).toBeNull();
    expect(parseInRange("50", 16, 10_000)).toBe(50);
  });

  it("accepts decimals with a comma and rejects unfinished text", () => {
    expect(parseInRange("4,5", 0, 20)).toBe(4.5);
    expect(parseInRange("", 0, 20)).toBeNull();
    expect(parseInRange("4.", 0, 20)).toBeNull();
  });
});

describe("commitBoundedNumber", () => {
  it("clamps a finished out-of-range number", () => {
    expect(commitBoundedNumber("5", 16, 10_000)).toBe(16);
    expect(commitBoundedNumber("50000", 16, 10_000)).toBe(10_000);
    expect(commitBoundedNumber("50", 16, 10_000)).toBe(50);
  });

  it("returns null for an empty or unfinished field", () => {
    expect(commitBoundedNumber("", 16, 10_000)).toBeNull();
    expect(commitBoundedNumber("-", 0, 20)).toBeNull();
    expect(commitBoundedNumber("abc", 0, 20)).toBeNull();
  });
});
