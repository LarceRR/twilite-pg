export const PIXEL_OBJECT_TYPES = ["Good", "Bad"] as const;

export type PixelObjectType = (typeof PIXEL_OBJECT_TYPES)[number];

export const PIXEL_OBJECT_TYPE_LABEL: Record<PixelObjectType, string> = {
  Good: "Хороший момент",
  Bad: "Плохой момент",
};

export function parsePixelObjectType(value: string | null | undefined): PixelObjectType | null {
  if (value === "Good" || value === "Bad") {
    return value;
  }
  return null;
}
