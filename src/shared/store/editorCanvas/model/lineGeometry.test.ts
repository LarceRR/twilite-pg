import { describe, expect, it } from "vitest";
import { snapLineEndpoint } from "./lineGeometry";

describe("snapLineEndpoint", () => {
  it("keeps horizontal and vertical lines on their axes", () => {
    expect(snapLineEndpoint({ x: 2, y: 3 }, { x: 12, y: 3 })).toEqual({
      x: 12,
      y: 3,
    });
    expect(snapLineEndpoint({ x: 2, y: 3 }, { x: 2, y: 13 })).toEqual({
      x: 2,
      y: 13,
    });
  });

  it("snaps to the nearest 45 degree diagonal", () => {
    expect(snapLineEndpoint({ x: 0, y: 0 }, { x: 10, y: 9 })).toEqual({
      x: 10,
      y: 10,
    });
  });

  it("snaps shallow angles to horizontal", () => {
    expect(snapLineEndpoint({ x: 5, y: 5 }, { x: 15, y: 6 })).toEqual({
      x: 15,
      y: 5,
    });
  });

  it("keeps a zero-length line unchanged", () => {
    expect(snapLineEndpoint({ x: 4, y: 7 }, { x: 4, y: 7 })).toEqual({
      x: 4,
      y: 7,
    });
  });
});
