import { describe, expect, it } from "vitest";

import type { PixelObjectDto } from "@/shared/api/pixelObjects";
import { loadPixelObjectIntoEditor } from "./loadPixelObjectIntoEditor";

const baseItem: PixelObjectDto = {
  id: "11111111-1111-4111-8111-111111111111",
  projectId: "44444444-4444-4444-8444-444444444444",
  title: "Lantern",
  authorDisplayName: "Maku",
  authorUserId: "22222222-2222-4222-8222-222222222222",
  objectType: "Good",
  status: "pending",
  rejectionComment: null,
  revision: 1,
  manifest: {
    format: "twilite.pixelobject/v1",
    canvas: { width: 8, height: 8 },
    sheet: {
      mediaId: "33333333-3333-4333-8333-333333333333",
      frameWidth: 8,
      frameHeight: 8,
      columns: 1,
      rows: 1,
      frameCount: 1,
    },
    animations: [{ id: "default", loop: true, frames: [{ frame: 0, durationMs: 100 }] }],
    staticPreviewFrame: 0,
  },
  sheetUrl: "https://example.test/sheet.png",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  reviewedAt: null,
};

describe("loadPixelObjectIntoEditor", () => {
  it("refuses pending objects so authors wait for moderation", async () => {
    await expect(loadPixelObjectIntoEditor(baseItem)).rejects.toThrow(/модерац/i);
  });
});
