import { describe, expect, it } from "vitest";
import { BRUSH_SHAPES } from "./brushShapes";
import { SHAPE_TOOL_SHAPES } from "./shapeToolShapes";

describe("shape tool catalog", () => {
  it("keeps geometric lines separate from brush stamps", () => {
    expect(BRUSH_SHAPES).toEqual(["square", "circle", "diamond"]);
    expect(SHAPE_TOOL_SHAPES).toEqual(["line"]);
  });
});
