import { describe, expect, it } from "vitest";
import { EDITOR_TOOLS } from "./tools";

describe("editor tool catalog", () => {
  it("registers Shapes without creating a standalone Line tool", () => {
    expect(EDITOR_TOOLS.some((tool) => tool.name === "Shapes")).toBe(true);
    expect(EDITOR_TOOLS.some((tool) => tool.name === "Line")).toBe(false);
    expect(EDITOR_TOOLS.some((tool) => tool.name === "Fill")).toBe(true);
  });
});
