import { describe, expect, it } from "vitest";

import { TPO_FORMAT } from "./constants";
import { buildLocalManifest, fileSlug, toSubmitManifest } from "./manifest";
import { packSheet } from "./pixels";

describe("TPO manifest", () => {
  it("stays consistent with the packed sheet", () => {
    const frame = new Uint8ClampedArray(2 * 2 * 4);
    frame[3] = 255;
    const second = new Uint8ClampedArray(frame);
    const sheet = packSheet([frame, second], 2, 2);
    const local = buildLocalManifest({
      width: 2,
      height: 2,
      sheet,
      durationsMs: [100, 80],
    });

    expect(local.format).toBe(TPO_FORMAT);
    expect(local.sheet.frameCount).toBe(2);
    expect(local.sheet.columns * local.sheet.rows).toBeGreaterThanOrEqual(local.sheet.frameCount);
    expect(local.sheet.frameWidth).toBe(2);
    expect(local.animations[0].frames.map((item) => item.frame)).toEqual([0, 1]);
    expect(local.animations[0].loop).toBe(true);
    expect(local.staticPreviewFrame).toBe(0);

    const submit = toSubmitManifest(local, "11111111-1111-4111-8111-111111111111");
    expect(submit.sheet.mediaId).toBe("11111111-1111-4111-8111-111111111111");
    expect(submit.sheet.frameCount).toBe(local.sheet.frameCount);
    expect("file" in submit.sheet).toBe(false);
  });

  it("slugifies a title for download names", () => {
    expect(fileSlug("  Red Spark! ")).toBe("red-spark");
    expect(fileSlug("   ")).toBe("pixel-object");
  });
});
