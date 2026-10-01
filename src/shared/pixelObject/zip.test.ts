import { describe, expect, it } from "vitest";

import { TPO_FORMAT } from "./constants";
import { buildTpoZip, readStoredZip } from "./zip";

describe("TPO zip", () => {
  it("stores manifest.json and sheet.png without compression", () => {
    const manifest = JSON.stringify({ format: TPO_FORMAT, sheet: { file: "sheet.png", frameCount: 1 } });
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const entries = readStoredZip(buildTpoZip(manifest, png));

    expect(entries.map((entry) => entry.name)).toEqual(["manifest.json", "sheet.png"]);
    expect(new TextDecoder().decode(entries[0]?.data)).toBe(manifest);
    expect(entries[1]?.data).toEqual(png);
    expect(JSON.parse(new TextDecoder().decode(entries[0]?.data ?? new Uint8Array()))).toMatchObject({
      format: TPO_FORMAT,
      sheet: { frameCount: 1 },
    });
  });
});
