export const BRUSH_SHAPES = ["square", "circle", "diamond"] as const;

export type BrushShape = (typeof BRUSH_SHAPES)[number];

export const DEFAULT_BRUSH_SHAPE: BrushShape = "square";

export function isBrushShape(value: string): value is BrushShape {
  return (BRUSH_SHAPES as readonly string[]).includes(value);
}

export const BRUSH_SHAPE_LABELS: Record<BrushShape, string> = {
  square: "Квадрат",
  circle: "Круг",
  diamond: "Ромб",
};
