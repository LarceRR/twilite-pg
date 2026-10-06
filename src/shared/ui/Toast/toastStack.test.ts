import { describe, expect, it } from "vitest";

import { computeToastStackLayout, sumHeightsBefore } from "./toastStack";

describe("computeToastStackLayout", () => {
  it("stacks collapsed toasts behind the front one", () => {
    expect(
      computeToastStackLayout({
        index: 1,
        expanded: false,
        frontHeight: 48,
        heightsBefore: 48,
      }),
    ).toEqual({
      offsetY: 14,
      scale: 0.95,
      clippedHeight: 48,
    });
  });

  it("expands using prior heights and gaps", () => {
    expect(
      computeToastStackLayout({
        index: 2,
        expanded: true,
        frontHeight: 48,
        heightsBefore: 100,
        gap: 12,
      }),
    ).toEqual({
      offsetY: 124,
      scale: 1,
      clippedHeight: null,
    });
  });
});

describe("sumHeightsBefore", () => {
  it("sums only preceding toast heights", () => {
    const heights = [
      { id: "a", height: 40 },
      { id: "b", height: 50 },
      { id: "c", height: 60 },
    ];
    expect(sumHeightsBefore(heights, ["a", "b", "c"], 2)).toBe(90);
    expect(sumHeightsBefore(heights, ["a", "b", "c"], 0)).toBe(0);
  });
});
