import { describe, expect, it } from "vitest";
import { TPG_IMAGE_MAX_BYTES } from "@/shared/api/tpg";
import { classifyImportFile, formatByteSize, pickImportFile } from "./importFile";

function fileWithSize(name: string, type: string, size: number): File {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("classifyImportFile", () => {
  it("rejects a missing file, a non-image, an empty file, and an oversized file", () => {
    expect(classifyImportFile(null).ok).toBe(false);
    expect(classifyImportFile(new File(["x"], "note.txt", { type: "text/plain" })).ok).toBe(false);
    expect(classifyImportFile(fileWithSize("empty.png", "image/png", 0)).ok).toBe(false);
    const huge = classifyImportFile(fileWithSize("big.png", "image/png", TPG_IMAGE_MAX_BYTES + 1));
    expect(huge.ok).toBe(false);
    if (!huge.ok) {
      expect(huge.reason).toContain(formatByteSize(TPG_IMAGE_MAX_BYTES));
    }
  });

  it("accepts png, jpeg, webp, and gif", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(classifyImportFile(new File(["x"], "art", { type })).ok).toBe(true);
    }
  });

  it("prefers an image when a drop contains mixed files", () => {
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    const png = new File(["x"], "a.png", { type: "image/png" });
    expect(pickImportFile([pdf, png])?.name).toBe("a.png");
    expect(pickImportFile([pdf])?.name).toBe("a.pdf");
  });
});
