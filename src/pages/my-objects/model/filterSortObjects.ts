import type { PixelObjectDto } from "@/shared/api/pixelObjects";

import { objectCategoryId, type ObjectCategoryId, type ObjectStatusFilter } from "./objectCategories";

export type { ObjectStatusFilter };
export type ObjectSortMode = "updated" | "title";

export function filterSortObjects(
  items: readonly PixelObjectDto[],
  query: string,
  sortMode: ObjectSortMode,
  status: ObjectStatusFilter,
  category: ObjectCategoryId,
): PixelObjectDto[] {
  const normalized = query.trim().toLocaleLowerCase("ru");
  const filtered = items.filter((item) => {
    if (status !== "all" && item.status !== status) {
      return false;
    }
    if (category !== "all" && objectCategoryId(item) !== category) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    return item.title.toLocaleLowerCase("ru").includes(normalized);
  });

  return filtered.sort((a, b) => {
    if (sortMode === "title") {
      return a.title.localeCompare(b.title, "ru", { sensitivity: "base" });
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
