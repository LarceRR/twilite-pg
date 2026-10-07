import type { PixelObjectDto, PixelObjectStatus } from "@/shared/api/pixelObjects";

export const OBJECT_CATEGORIES = [
  { id: "all", label: "Все объекты" },
  { id: "characters", label: "Персонажи" },
  { id: "items", label: "Предметы" },
  { id: "buildings", label: "Постройки" },
  { id: "nature", label: "Природа" },
  { id: "transport", label: "Транспорт" },
  { id: "other", label: "Прочее" },
] as const;

export type ObjectCategoryId = (typeof OBJECT_CATEGORIES)[number]["id"];

const CATEGORY_IDS = new Set<string>(
  OBJECT_CATEGORIES.map((category) => category.id).filter((id) => id !== "all"),
);

export function isObjectCategoryId(value: string): value is Exclude<ObjectCategoryId, "all"> {
  return CATEGORY_IDS.has(value);
}

export type ObjectStatusFilter = "all" | PixelObjectStatus;

export function objectCategoryId(item: PixelObjectDto): Exclude<ObjectCategoryId, "all"> | null {
  const category = (item as PixelObjectDto & { category?: unknown }).category;
  if (typeof category !== "string" || !isObjectCategoryId(category)) {
    return null;
  }
  return category;
}
