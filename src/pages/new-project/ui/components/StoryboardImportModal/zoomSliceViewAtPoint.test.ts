import { describe, expect, it } from "vitest";
import { zoomSliceViewAtPoint } from "./StoryboardSliceViewport";

describe("zoomSliceViewAtPoint", () => {
  it("keeps the pixel under the cursor fixed", () => {
    const view = { zoom: 2, x: 10, y: 20 };
    const anchorX = 50;
    const anchorY = 80;
    const worldX = (anchorX - view.x) / view.zoom;
    const worldY = (anchorY - view.y) / view.zoom;

    const next = zoomSliceViewAtPoint(view, anchorX, anchorY, 4);

    expect(next.zoom).toBe(4);
    expect((anchorX - next.x) / next.zoom).toBeCloseTo(worldX);
    expect((anchorY - next.y) / next.zoom).toBeCloseTo(worldY);
  });

  it("leaves the view unchanged when zoom does not move", () => {
    const view = { zoom: 2, x: 10, y: 20 };
    expect(zoomSliceViewAtPoint(view, 4, 8, 2)).toBe(view);
  });
});
