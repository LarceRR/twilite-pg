import { describe, expect, it } from "vitest";
import { EDITOR_TOOLS } from "./tools";

describe("editor tool catalog", () => {
  it("registers Shapes without creating a standalone Line tool", () => {
    expect(EDITOR_TOOLS.some((tool) => tool.name === "Shapes")).toBe(true);
    expect(EDITOR_TOOLS.some((tool) => tool.name === "Line")).toBe(false);
    expect(EDITOR_TOOLS.some((tool) => tool.name === "Fill")).toBe(true);
  });

  it("lets brush and eraser grow to size 100", () => {
    for (const name of ["Brush", "Eraser"] as const) {
      const size = EDITOR_TOOLS.find((tool) => tool.name === name)?.toolProperties?.find(
        (property) => property.toolName === "Size",
      );
      expect(size?.toolMaxAmount).toBe(100);
      expect(size?.toolMinAmount).toBe(1);
    }
  });
});
