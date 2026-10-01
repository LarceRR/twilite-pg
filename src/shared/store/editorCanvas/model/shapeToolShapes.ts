export const SHAPE_TOOL_SHAPES = ["line"] as const;

export type ShapeToolShape = (typeof SHAPE_TOOL_SHAPES)[number];

export const DEFAULT_SHAPE_TOOL_SHAPE: ShapeToolShape = "line";

export function isShapeToolShape(value: string): value is ShapeToolShape {
  return (SHAPE_TOOL_SHAPES as readonly string[]).includes(value);
}

export const SHAPE_TOOL_LABELS: Record<ShapeToolShape, string> = {
  line: "Линия",
};
