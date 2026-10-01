import { describe, expect, it } from "vitest";
import {
  clampViewportPan,
  clampViewportZoom,
  clientPointToDocumentPixel,
  clientPointToDocumentPixelClamped,
  createPixelGridPath,
  fitViewport,
  MAX_VIEWPORT_ZOOM,
  MIN_VIEWPORT_ZOOM,
  zoomAtPoint,
} from "./viewport";

describe("viewport math", () => {
  it("keeps the world point under the cursor while zooming", () => {
    const transform = { zoom: 3, panX: -87, panY: 42 };
    const cursor = { x: 173.25, y: 118.75 };
    const worldX = (cursor.x - transform.panX) / transform.zoom;
    const worldY = (cursor.y - transform.panY) / transform.zoom;

    const next = zoomAtPoint(transform, cursor, 4);

    expect(next.zoom).toBe(4);
    expect(Math.abs(worldX * next.zoom + next.panX - cursor.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(worldY * next.zoom + next.panY - cursor.y)).toBeLessThanOrEqual(0.5);
  });

  it("allows integer zoom levels only and clamps their range", () => {
    for (let zoom = MIN_VIEWPORT_ZOOM; zoom <= MAX_VIEWPORT_ZOOM; zoom += 1) {
      expect(clampViewportZoom(zoom)).toBe(zoom);
    }
    expect(clampViewportZoom(-10)).toBe(MIN_VIEWPORT_ZOOM);
    expect(clampViewportZoom(8.7)).toBe(9);
    expect(clampViewportZoom(100)).toBe(MAX_VIEWPORT_ZOOM);
  });

  it("fits and centers the document at an integer zoom", () => {
    expect(fitViewport({ width: 700, height: 540 }, { width: 160, height: 160 })).toEqual({
      zoom: 3,
      panX: 110,
      panY: 30,
    });
  });

  it("keeps at least the configured canvas edge visible", () => {
    const viewport = { width: 500, height: 400 };
    const document = { width: 160, height: 160 };

    expect(clampViewportPan({ zoom: 4, panX: 10_000, panY: 10_000 }, viewport, document)).toEqual({
      zoom: 4,
      panX: 436,
      panY: 336,
    });
    expect(clampViewportPan({ zoom: 4, panX: -10_000, panY: -10_000 }, viewport, document)).toEqual(
      { zoom: 4, panX: -576, panY: -576 },
    );
  });

  it("maps a displayed canvas point back to the exact document pixel", () => {
    const rect = { left: 100, top: 50, width: 640, height: 640 };
    const document = { width: 160, height: 160 };
    const clientX = rect.left + (42 + 0.25) * 4;
    const clientY = rect.top + (91 + 0.75) * 4;

    expect(clientPointToDocumentPixel(clientX, clientY, rect, document)).toEqual({
      x: 42,
      y: 91,
    });
    expect(clientPointToDocumentPixel(rect.left + rect.width, clientY, rect, document)).toBeNull();
    expect(
      clientPointToDocumentPixelClamped(rect.left + rect.width + 20, rect.top - 20, rect, document),
    ).toEqual({ x: 159, y: 0 });
  });

  it("places grid lines on pixel boundaries with a half-pixel offset", () => {
    expect(createPixelGridPath({ width: 2, height: 2 }, 8)).toBe(
      "M 0.5 0 V 16 M 8.5 0 V 16 M 15.5 0 V 16 " + "M 0 0.5 H 16 M 0 8.5 H 16 M 0 15.5 H 16",
    );
  });
});
